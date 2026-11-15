using MediatR;
using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Application.Auth;
using Popkin.Domain;

namespace Popkin.Application.Administration.Auth;

/// <summary>
/// Adds the first Owner, named by `Admin:FirstOwner`, when that email is not an admin
/// (L2-078 AC1, L2-119 AC9). It does nothing for an email that is already an admin's.
/// </summary>
public sealed record EnsureFirstOwnerCommand(string? Email) : IRequest<bool>;

public sealed class EnsureFirstOwnerCommandHandler(IAppDbContext db, TimeProvider clock, IAuditLog audit) : IRequestHandler<EnsureFirstOwnerCommand, bool>
{
    public async Task<bool> Handle(EnsureFirstOwnerCommand request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Email))
        {
            return false;
        }

        var email = ContactRules.Normalise(ContactChannel.Email, request.Email);
        var owner = await db.Admins.FirstOrDefaultAsync(a => a.Email == email, cancellationToken);
        if (owner is { IsRemoved: false })
        {
            return false;
        }

        if (owner is null)
        {
            owner = Admin.Invite(email, AdminRole.Owner, null, clock.GetUtcNow());
            db.Admins.Add(owner);
        }
        else
        {
            owner.Reinvite(AdminRole.Owner, null, clock.GetUtcNow());
        }

        audit.RecordByPopkin(new AuditRecord(
            AuditAction.AddedAdmin,
            AuditTargetKind.Admin,
            owner.Id.ToString(),
            owner.Name,
            Details: new Dictionary<string, object?> { ["role"] = nameof(AdminRole.Owner), ["firstOwner"] = true }));
        await db.SaveChangesAsync(cancellationToken);
        return true;
    }
}
