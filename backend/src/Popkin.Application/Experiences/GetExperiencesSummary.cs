using MediatR;
using Popkin.Application.Security;

namespace Popkin.Application.Experiences;

/// <summary>An experience as the Popkin home shows it: its name, its photo if it has one, its average rating and how many rated it.</summary>
public sealed record TopExperienceDto(Guid Id, string Name, string? PhotoUrl, double Average, int RatingCount);

/// <summary>The Experiences section of the Popkin home: how many experiences there are and the highest rated (L2-019 AC5).</summary>
public sealed record ExperiencesSummaryDto(int Count, IReadOnlyList<TopExperienceDto> Top);

/// <summary>The experiences of a Popkin in brief, for any of its members (L2-019 AC5, L2-051 AC1).</summary>
public sealed record GetExperiencesSummaryQuery(Guid PopkinId) : IRequest<ExperiencesSummaryDto>;

public sealed class GetExperiencesSummaryQueryHandler(IMembershipGuard guard) : IRequestHandler<GetExperiencesSummaryQuery, ExperiencesSummaryDto>
{
    public async Task<ExperiencesSummaryDto> Handle(GetExperiencesSummaryQuery request, CancellationToken cancellationToken)
    {
        await guard.RequireMemberAsync(request.PopkinId, cancellationToken);

        // A Popkin has no experiences until they are built (journey 8), so the section is empty.
        return new ExperiencesSummaryDto(0, []);
    }
}
