using MediatR;
using Popkin.Application.Abstractions;
using Popkin.Application.Problems;

namespace Popkin.Application.Photos;

/// <summary>
/// A stored file, read through its signed address. Anything else, a missing file, a changed
/// signature or an address past its time, is the same 404 (L2-051 AC2).
/// </summary>
public sealed record GetPhotoFileQuery(string Key, long Expires, string? Signature, string? Download = null) : IRequest<StoredPhoto>;

public sealed class GetPhotoFileQueryHandler(IPhotoStore store, PhotoUrlSigner signer) : IRequestHandler<GetPhotoFileQuery, StoredPhoto>
{
    public async Task<StoredPhoto> Handle(GetPhotoFileQuery request, CancellationToken cancellationToken)
    {
        var file = signer.IsValid(request.Key, request.Expires, request.Signature, request.Download)
            ? await store.OpenAsync(request.Key, cancellationToken)
            : null;
        return file ?? throw new ProblemException(404, "file_not_found", "This file isn't here.");
    }
}
