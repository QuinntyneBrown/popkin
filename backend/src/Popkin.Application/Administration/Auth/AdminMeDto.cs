using Popkin.Domain;

namespace Popkin.Application.Administration.Auth;

/// <summary>The signed-in admin and the actions their role allows, which the admin app disables by (L2-086).</summary>
public sealed record AdminMeDto(Guid AdminId, string Name, string Email, AdminRole Role, IReadOnlyList<AdminAction> Allowed)
{
    public static AdminMeDto From(Admin admin) => new(admin.Id, admin.Name, admin.Email, admin.Role, AdminPermissions.AllowedFor(admin.Role));
}

/// <summary>A code sent to a staff email; the same answer for every whole address (L2-088 AC3).</summary>
public sealed record AdminCodeSentDto(Guid VerificationId, string SentTo, DateTimeOffset ExpiresAt, DateTimeOffset ResendAvailableAt)
{
    public static AdminCodeSentDto From(VerificationCode code) => new(code.Id, code.Destination, code.ExpiresAt, code.ResendAvailableAt);
}
