using Microsoft.EntityFrameworkCore;
using Popkin.Application.Abstractions;
using Popkin.Domain;

namespace Popkin.Application.Notifications;

/// <summary>
/// The one <see cref="NotificationPlatform"/> row: the pause and the defaults. Each reader reads it
/// as it is now, so an Owner's change applies at the next request or dispatcher tick (L2-173 AC4).
/// </summary>
public static class NotificationPlatformRow
{
    /// <summary>The row as it stands; its first values while no Owner has changed anything.</summary>
    public static async Task<NotificationPlatform> ReadAsync(IAppDbContext db, CancellationToken cancellationToken) =>
        await db.NotificationPlatforms.AsNoTracking().FirstOrDefaultAsync(cancellationToken) ?? NotificationPlatform.Defaults();

    /// <summary>The row to change, added with its first values when missing.</summary>
    public static async Task<NotificationPlatform> LoadAsync(IAppDbContext db, CancellationToken cancellationToken)
    {
        var platform = await db.NotificationPlatforms.FirstOrDefaultAsync(cancellationToken);
        if (platform is null)
        {
            platform = NotificationPlatform.Defaults();
            db.NotificationPlatforms.Add(platform);
        }

        return platform;
    }
}
