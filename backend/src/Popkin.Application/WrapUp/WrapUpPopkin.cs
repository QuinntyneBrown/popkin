using MediatR;
using Popkin.Application.Problems;
using Popkin.Application.Security;

namespace Popkin.Application.WrapUp;

/// <summary>The Popkin that wrapped up and when.</summary>
public sealed record WrapUpResultDto(Guid PopkinId, DateTimeOffset WrappedUpAt);

/// <summary>
/// The Host wraps the Popkin up, keeping its photo album or not (L2-043). Anyone else who is a
/// member is refused with 403 `host_only` (L2-043 AC6, L2-051 AC4).
/// </summary>
public sealed record WrapUpPopkinCommand(Guid PopkinId, bool? KeepPhotos) : IRequest<WrapUpResultDto>;

public sealed class WrapUpPopkinCommandHandler(IMembershipGuard guard, PopkinWrapUpService wrapUp)
    : IRequestHandler<WrapUpPopkinCommand, WrapUpResultDto>
{
    public async Task<WrapUpResultDto> Handle(WrapUpPopkinCommand request, CancellationToken cancellationToken)
    {
        var (popkin, _) = await guard.RequireHostAsync(request.PopkinId, cancellationToken);
        if (request.KeepPhotos is not { } keepPhotos)
        {
            throw ProblemException.Invalid("validation_failed", "Say whether to keep the photo album.", "keepPhotos");
        }

        if (!await wrapUp.WrapUpAsync(popkin, keepPhotos, cancellationToken))
        {
            // Its time ran out in the same moment: it has wrapped up, though not by this request.
            throw MembershipGuard.WrappedUp();
        }

        return new WrapUpResultDto(popkin.Id, popkin.WrappedUpAt!.Value);
    }
}
