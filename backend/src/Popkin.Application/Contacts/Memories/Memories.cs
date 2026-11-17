using System.Globalization;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Contacts.Security;
using Popkin.Application.Invites;
using Popkin.Application.Photos;
using Popkin.Application.Problems;
using Popkin.Domain;

namespace Popkin.Application.Contacts.Memories;

/// <summary>A photo memory: its caption, its day and addresses that expire (L2-136 AC1).</summary>
public sealed record PhotoMemoryDto(Guid Id, string? Caption, DateOnly Day, string ThumbnailUrl, string PhotoUrl);

/// <summary>A file memory: its name, the day it was added, its size and where to download it.</summary>
public sealed record FileMemoryDto(Guid Id, string FileName, DateOnly AddedOn, long SizeBytes, string DownloadUrl);

/// <summary>A note memory, with the day it was last updated: the day it was added (gap 107).</summary>
public sealed record NoteMemoryDto(Guid Id, string Text, DateOnly UpdatedOn);

/// <summary>"Memories & files" (L2-136 AC1): each kind newest first.</summary>
public sealed record MemoriesDto(IReadOnlyList<PhotoMemoryDto> Photos, IReadOnlyList<FileMemoryDto> Files, IReadOnlyList<NoteMemoryDto> Notes);

/// <summary>A file as it was uploaded, with the name and type the browser gave it.</summary>
public sealed record MemoryUpload(Stream Content, long Length, string FileName);

public sealed record AddNoteMemoryRequest(Guid ClientId, string? Text);

/// <summary>What a memory must be (L2-136 AC3, known gap 107 ruled), and how each kind is shown.</summary>
public static class MemoryRules
{
    private static readonly Dictionary<string, string> OfficeTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        [".docx"] = "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        [".xlsx"] = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        [".doc"] = "application/msword",
        [".xls"] = "application/vnd.ms-excel",
    };

    public static string? Caption(string? caption)
    {
        if (string.IsNullOrWhiteSpace(caption))
        {
            return null;
        }

        var trimmed = caption.Trim();
        return trimmed.Length <= Memory.MaxCaptionLength
            ? trimmed
            : throw ProblemException.Invalid("caption_too_long", $"Keep it to {Memory.MaxCaptionLength} characters.", "caption");
    }

    public static string Note(string? text)
    {
        var trimmed = string.IsNullOrWhiteSpace(text)
            ? throw ProblemException.Invalid("note_required", "Write the note.", "text")
            : text.Trim();
        return trimmed.Length <= Memory.MaxNoteLength
            ? trimmed
            : throw ProblemException.Invalid("note_too_long", $"Keep it to {Memory.MaxNoteLength:N0} characters.", "text");
    }

    public static DateOnly? TakenOn(string? day) =>
        string.IsNullOrWhiteSpace(day) ? null
        : DateOnly.TryParseExact(day, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var on) ? on
        : throw ProblemException.Invalid("taken_on_not_valid", "That day isn't in the calendar.", "takenOn");

    /// <summary>
    /// A file's type, decided from its own bytes and, for an Office document, its name: a PDF, a
    /// Word document, a spreadsheet, plain text or a picture; null for anything else (gap 107).
    /// </summary>
    public static string? FileType(ReadOnlySpan<byte> bytes, string fileName)
    {
        if (bytes.StartsWith("%PDF-"u8))
        {
            return "application/pdf";
        }

        if (ImageSniffer.Sniff(bytes) is { } image)
        {
            return image switch
            {
                ImageType.Jpeg => "image/jpeg",
                ImageType.Png => "image/png",
                ImageType.WebP => "image/webp",
                _ => "image/heic",
            };
        }

        var extension = Path.GetExtension(fileName).ToLowerInvariant();
        var zip = bytes.StartsWith<byte>([0x50, 0x4B, 0x03, 0x04]);
        var ole = bytes.StartsWith<byte>([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]);
        if (OfficeTypes.TryGetValue(extension, out var office)
            && ((zip && extension.EndsWith('x')) || (ole && !extension.EndsWith('x'))))
        {
            return office;
        }

        if (extension.Equals(".txt", StringComparison.OrdinalIgnoreCase) && !bytes.Contains((byte)0))
        {
            return "text/plain";
        }

        return null;
    }

    /// <summary>The name a file is listed and downloaded under, without any folder.</summary>
    public static string FileName(string? fileName)
    {
        // A browser may send a folder with either separator, whatever the server's own is.
        var given = fileName ?? string.Empty;
        var name = given[(given.LastIndexOfAny(['/', '\\']) + 1)..].Trim();
        if (name.Length == 0)
        {
            return "File";
        }

        return name.Length <= Memory.MaxFileNameLength ? name : name[..Memory.MaxFileNameLength];
    }

    public static PhotoMemoryDto PhotoOf(Memory memory, IPhotoStore photos) =>
        new(memory.Id, memory.Caption, memory.Day, photos.GetReadUrl(memory.ThumbnailKey!), photos.GetReadUrl(memory.FileKey!));

    public static FileMemoryDto FileOf(Memory memory, IPhotoStore photos) =>
        new(memory.Id, memory.FileName!, memory.Day, memory.SizeBytes ?? 0, photos.GetDownloadUrl(memory.FileKey!, memory.FileName!));

    public static NoteMemoryDto NoteOf(Memory memory) => new(memory.Id, memory.Text!, memory.Day);

    /// <summary>Saves once; the files stored for this memory are deleted if the save fails.</summary>
    public static async Task SaveAsync(IAppDbContext db, IPhotoStore photos, Memory memory, CancellationToken cancellationToken)
    {
        db.Memories.Add(memory);
        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch
        {
            await PhotoFiles.DeleteAsync(photos, memory.Keys);
            throw;
        }
    }
}

/// <summary>The memory, and whether this request kept it (201) or a resend found it (200).</summary>
public sealed record AddedMemory<T>(T Memory, bool Created);

public sealed record AddPhotoMemoryCommand(Guid ContactId, Guid ClientId, PhotoUpload? Photo, string? Caption, string? TakenOn)
    : IRequest<AddedMemory<PhotoMemoryDto>>;

/// <summary>
/// Keeps a photo about a contact (L2-136 AC2): turned upright, its location and device data
/// removed (L2-054), a display image and a thumbnail under random keys.
/// </summary>
public sealed class AddPhotoMemoryCommandHandler(
    IAppDbContext db, ICurrentPerson current, ContactsSwitch contacts, IContactGuard guard, IPhotoProcessor processor, IPhotoStore photos, TimeProvider clock)
    : IRequestHandler<AddPhotoMemoryCommand, AddedMemory<PhotoMemoryDto>>
{
    public async Task<AddedMemory<PhotoMemoryDto>> Handle(AddPhotoMemoryCommand request, CancellationToken cancellationToken)
    {
        contacts.Require();
        var owner = current.PersonId;
        var contact = await guard.RequireOwnedAsync(request.ContactId, cancellationToken);
        if (await ClientWrites.FindAsync(db.Memories, owner, request.ClientId, cancellationToken) is { } saved)
        {
            return new AddedMemory<PhotoMemoryDto>(MemoryRules.PhotoOf(saved, photos), false);
        }

        var caption = MemoryRules.Caption(request.Caption);
        var takenOn = MemoryRules.TakenOn(request.TakenOn);
        if (request.Photo is not { } upload)
        {
            throw ProblemException.Invalid("validation_failed", "Choose a photo to add.", "file");
        }

        if (upload.Length > Memory.MaxBytes)
        {
            throw ProblemException.Invalid("photo_too_large", "A photo can be up to 25 MB.", "file");
        }

        using var buffer = new MemoryStream();
        await upload.Content.CopyToAsync(buffer, cancellationToken);
        var bytes = buffer.ToArray();
        var processed = (ImageSniffer.Sniff(bytes) is null ? null : processor.MakeAlbumPhoto(bytes))
            ?? throw ProblemException.Invalid("photo_type_not_allowed", "A photo must be a JPEG, PNG, WebP or HEIC image.", "file");

        var name = $"memories/{owner:N}/{Guid.NewGuid():N}";
        var displayKey = $"{name}{processed.Display.Extension}";
        var thumbnailKey = $"{name}-thumbnail{processed.Thumbnail.Extension}";
        await photos.SaveAsync(displayKey, processed.Display.Content, processed.Display.ContentType, cancellationToken);
        await photos.SaveAsync(thumbnailKey, processed.Thumbnail.Content, processed.Thumbnail.ContentType, cancellationToken);
        var now = clock.GetUtcNow();
        var day = takenOn
            ?? (processed.CapturedAt is { } captured ? DateOnly.FromDateTime(captured.DateTime) : DateOnly.FromDateTime(now.UtcDateTime));
        var memory = Memory.AddPhoto(owner, request.ClientId, contact.Id, displayKey, thumbnailKey, caption, day, now);
        await MemoryRules.SaveAsync(db, photos, memory, cancellationToken);
        return new AddedMemory<PhotoMemoryDto>(MemoryRules.PhotoOf(memory, photos), true);
    }
}

public sealed record AddFileMemoryCommand(Guid ContactId, Guid ClientId, MemoryUpload? File) : IRequest<AddedMemory<FileMemoryDto>>;

/// <summary>Keeps a file about a contact as it is (known gap 107, ruled).</summary>
public sealed class AddFileMemoryCommandHandler(
    IAppDbContext db, ICurrentPerson current, ContactsSwitch contacts, IContactGuard guard, IPhotoStore photos, TimeProvider clock)
    : IRequestHandler<AddFileMemoryCommand, AddedMemory<FileMemoryDto>>
{
    public async Task<AddedMemory<FileMemoryDto>> Handle(AddFileMemoryCommand request, CancellationToken cancellationToken)
    {
        contacts.Require();
        var owner = current.PersonId;
        var contact = await guard.RequireOwnedAsync(request.ContactId, cancellationToken);
        if (await ClientWrites.FindAsync(db.Memories, owner, request.ClientId, cancellationToken) is { } saved)
        {
            return new AddedMemory<FileMemoryDto>(MemoryRules.FileOf(saved, photos), false);
        }

        if (request.File is not { } upload)
        {
            throw ProblemException.Invalid("validation_failed", "Choose a file to add.", "file");
        }

        if (upload.Length > Memory.MaxBytes)
        {
            throw ProblemException.Invalid("file_too_large", "A file can be up to 25 MB.", "file");
        }

        using var buffer = new MemoryStream();
        await upload.Content.CopyToAsync(buffer, cancellationToken);
        var bytes = buffer.ToArray();
        var fileName = MemoryRules.FileName(upload.FileName);
        var contentType = MemoryRules.FileType(bytes, fileName)
            ?? throw ProblemException.Invalid("file_type_not_allowed", "Choose a PDF, a document, a spreadsheet or a picture.", "file");

        var key = $"memories/{owner:N}/{Guid.NewGuid():N}{Path.GetExtension(fileName).ToLowerInvariant()}";
        await photos.SaveAsync(key, bytes, contentType, cancellationToken);
        var now = clock.GetUtcNow();
        var memory = Memory.AddFile(owner, request.ClientId, contact.Id, key, fileName, contentType, bytes.LongLength, DateOnly.FromDateTime(now.UtcDateTime), now);
        await MemoryRules.SaveAsync(db, photos, memory, cancellationToken);
        return new AddedMemory<FileMemoryDto>(MemoryRules.FileOf(memory, photos), true);
    }
}

public sealed record AddNoteMemoryCommand(Guid ContactId, AddNoteMemoryRequest Note) : IRequest<AddedMemory<NoteMemoryDto>>;

/// <summary>Keeps a note about a contact (known gap 107, ruled).</summary>
public sealed class AddNoteMemoryCommandHandler(
    IAppDbContext db, ICurrentPerson current, ContactsSwitch contacts, IContactGuard guard, IPhotoStore photos, TimeProvider clock)
    : IRequestHandler<AddNoteMemoryCommand, AddedMemory<NoteMemoryDto>>
{
    public async Task<AddedMemory<NoteMemoryDto>> Handle(AddNoteMemoryCommand request, CancellationToken cancellationToken)
    {
        contacts.Require();
        var owner = current.PersonId;
        var contact = await guard.RequireOwnedAsync(request.ContactId, cancellationToken);
        if (await ClientWrites.FindAsync(db.Memories, owner, request.Note.ClientId, cancellationToken) is { } saved)
        {
            return new AddedMemory<NoteMemoryDto>(MemoryRules.NoteOf(saved), false);
        }

        var text = MemoryRules.Note(request.Note.Text);
        var now = clock.GetUtcNow();
        var memory = Memory.AddNote(owner, request.Note.ClientId, contact.Id, text, DateOnly.FromDateTime(now.UtcDateTime), now);
        await MemoryRules.SaveAsync(db, photos, memory, cancellationToken);
        return new AddedMemory<NoteMemoryDto>(MemoryRules.NoteOf(memory), true);
    }
}

/// <summary>"Memories & files" (L2-136 AC1): the contact's photos, files and notes, each newest first.</summary>
public sealed record GetMemoriesQuery(Guid ContactId) : IRequest<MemoriesDto>;

public sealed class GetMemoriesQueryHandler(
    IAppDbContext db, ICurrentPerson current, ContactsSwitch contacts, IContactGuard guard, IPhotoStore photos)
    : IRequestHandler<GetMemoriesQuery, MemoriesDto>
{
    public async Task<MemoriesDto> Handle(GetMemoriesQuery request, CancellationToken cancellationToken)
    {
        contacts.Require();
        var contact = await guard.RequireOwnedAsync(request.ContactId, cancellationToken);
        var memories = (await db.Memories.OwnedBy(current.PersonId).AsNoTracking()
                .Where(m => m.ContactId == contact.Id)
                .ToListAsync(cancellationToken))
            .OrderByDescending(m => m.Day)
            .ThenByDescending(m => m.AddedAt)
            .ToList();
        return new MemoriesDto(
            memories.Where(m => m.Kind == MemoryKind.Photo).Select(m => MemoryRules.PhotoOf(m, photos)).ToList(),
            memories.Where(m => m.Kind == MemoryKind.File).Select(m => MemoryRules.FileOf(m, photos)).ToList(),
            memories.Where(m => m.Kind == MemoryKind.Note).Select(MemoryRules.NoteOf).ToList());
    }
}
