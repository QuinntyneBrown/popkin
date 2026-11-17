// Traces to: L2-136, known gap 107 (ruled)
// Description: Which files a memory keeps, decided from their bytes, and a caption's and a note's limits.
using Popkin.Application.Contacts.Memories;
using Popkin.Application.Problems;
using Popkin.Domain;

namespace Popkin.Application.Tests.Contacts;

public sealed class MemoryRulesTests
{
    private static readonly byte[] Zip = [0x50, 0x4B, 0x03, 0x04, 0x14, 0x00];
    private static readonly byte[] Ole = [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1, 0x00];

    public static TheoryData<byte[], string, string?> Files => new()
    {
        { "%PDF-1.7\n"u8.ToArray(), "Wedding speech.pdf", "application/pdf" },
        { "%PDF-1.7\n"u8.ToArray(), "speech.txt", "application/pdf" },
        { [0xFF, 0xD8, 0xFF, 0xE0], "recipe.jpg", "image/jpeg" },
        { [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], "a.png", "image/png" },
        { Zip, "speech.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
        { Zip, "budget.XLSX", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
        { Ole, "speech.doc", "application/msword" },
        { Ole, "budget.xls", "application/vnd.ms-excel" },
        { Zip, "archive.zip", null },
        { Zip, "speech.doc", null },
        { Ole, "speech.docx", null },
        { "Gift ideas"u8.ToArray(), "ideas.txt", "text/plain" },
        { [0x47, 0x00, 0x69], "ideas.txt", null },
        { [0x4D, 0x5A, 0x90, 0x00], "setup.exe", null },
        { "Gift ideas"u8.ToArray(), "ideas.md", null },
    };

    [Theory]
    [MemberData(nameof(Files))]
    public void A_files_type_comes_from_its_bytes(byte[] bytes, string fileName, string? expected) =>
        Assert.Equal(expected, MemoryRules.FileType(bytes, fileName));

    [Theory]
    [InlineData(null, null)]
    [InlineData("   ", null)]
    [InlineData(" Hot sauce night ", "Hot sauce night")]
    public void A_caption_is_optional_and_trimmed(string? caption, string? expected) =>
        Assert.Equal(expected, MemoryRules.Caption(caption));

    [Fact]
    public void A_caption_is_up_to_200_characters()
    {
        Assert.Equal(200, MemoryRules.Caption(new string('a', 200))!.Length);
        Assert.Equal("caption_too_long", Assert.Throws<ProblemException>(() => MemoryRules.Caption(new string('a', 201))).Code);
    }

    [Theory]
    [InlineData(null, "note_required")]
    [InlineData("  ", "note_required")]
    [InlineData(Memory.MaxNoteLength + 1, "note_too_long")]
    public void A_note_needs_words_up_to_2000_characters(object? text, string code)
    {
        var note = text is int length ? new string('a', length) : (string?)text;
        Assert.Equal(code, Assert.Throws<ProblemException>(() => MemoryRules.Note(note)).Code);
    }

    [Theory]
    [InlineData(@"C:\fakepath\Wedding speech.pdf", "Wedding speech.pdf")]
    [InlineData("photos/2021/Wedding speech.pdf", "Wedding speech.pdf")]
    [InlineData("  ", "File")]
    [InlineData(null, "File")]
    public void A_files_name_has_no_folder(string? given, string expected) =>
        Assert.Equal(expected, MemoryRules.FileName(given));
}
