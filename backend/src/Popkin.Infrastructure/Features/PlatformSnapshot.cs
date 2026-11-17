using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Popkin.Application.Abstractions;
using Popkin.Domain;

namespace Popkin.Infrastructure.Features;

/// <summary>
/// The switches the API holds in memory, read from the database at most every
/// <see cref="RefreshAfter"/> and at the next request after <see cref="Invalidate"/> (L2-076
/// AC10, ADR 0024). Every reader asks it synchronously; one API instance holds the one snapshot
/// (ADR 0009). Before its first load every feature is off, the safe answer.
/// </summary>
public sealed class PlatformSnapshot(IServiceScopeFactory scopes, TimeProvider clock) : IFeatureSwitches, IPlatformSnapshot, INotificationPlatform, ILimits
{
    public static readonly TimeSpan RefreshAfter = TimeSpan.FromSeconds(30);

    private readonly SemaphoreSlim _loading = new(1, 1);
    private volatile PlatformValues _values = PlatformValues.Empty;
    private DateTimeOffset? _loadedAt;
    private volatile bool _stale = true;

    public bool IsOffered(Feature feature, Guid popkinId) => _values.IsOffered(feature, popkinId);

    public bool IsOfferedToNew(Feature feature) => _values.IsOfferedToNew(feature);

    public bool IsSwitchedOffByHost(Feature feature, Guid popkinId) => _values.IsSwitchedOffByHost(feature, popkinId);

    public bool IsKindOff(NotificationKind kind) => _values.KindsOff.Contains(kind);

    public bool IsPopkinHeld(Guid popkinId) => _values.HeldPopkins.Contains(popkinId);

    public int Get(LimitKey limit) => _values.Limits.TryGetValue(limit, out var value) ? value : LimitDefaults.Of(limit);

    public void Invalidate() => _stale = true;

    public async Task RefreshIfStaleAsync(CancellationToken cancellationToken)
    {
        if (!IsStale())
        {
            return;
        }

        await _loading.WaitAsync(cancellationToken);
        try
        {
            if (!IsStale())
            {
                return;
            }

            // Marked fresh before the read, so a change saved while it reads marks it stale again.
            _stale = false;
            _loadedAt = clock.GetUtcNow();
            using var scope = scopes.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<IAppDbContext>();
            var modes = await db.FeatureSettings.AsNoTracking().ToDictionaryAsync(s => s.Feature, s => s.Mode, cancellationToken);
            var chosen = await db.FeatureChosenPopkins.AsNoTracking().Select(c => new { c.Feature, c.PopkinId }).ToListAsync(cancellationToken);
            var hostOff = await db.PopkinFeaturesOff.AsNoTracking().Select(o => new { o.Feature, o.PopkinId }).ToListAsync(cancellationToken);
            var kindsOff = await db.NotificationKindSwitches.AsNoTracking().Select(s => s.Kind).ToListAsync(cancellationToken);
            var limits = await db.LimitSettings.AsNoTracking().ToDictionaryAsync(s => s.Limit, s => s.Value, cancellationToken);
            var held = await db.NotificationHolds.AsNoTracking().Where(h => h.ReleasedAt == null).Select(h => h.PopkinId).ToListAsync(cancellationToken);
            _values = new PlatformValues(
                modes,
                chosen.GroupBy(c => c.Feature).ToDictionary(g => g.Key, g => (IReadOnlySet<Guid>)g.Select(c => c.PopkinId).ToHashSet()),
                hostOff.GroupBy(o => o.Feature).ToDictionary(g => g.Key, g => (IReadOnlySet<Guid>)g.Select(o => o.PopkinId).ToHashSet()))
            {
                KindsOff = kindsOff.ToHashSet(),
                HeldPopkins = held.ToHashSet(),
                Limits = limits,
            };
        }
        catch
        {
            _stale = true;
            throw;
        }
        finally
        {
            _loading.Release();
        }
    }

    private bool IsStale() => _stale || _loadedAt is not { } at || clock.GetUtcNow() - at >= RefreshAfter;
}

/// <summary>
/// One immutable reading of the switches: each feature's mode, its chosen Popkins, and the
/// Popkins whose Host switched it off (ADR 0026), and the notification kinds off for everyone.
/// </summary>
public sealed record PlatformValues(
    IReadOnlyDictionary<Feature, FeatureMode> Modes,
    IReadOnlyDictionary<Feature, IReadOnlySet<Guid>> Chosen,
    IReadOnlyDictionary<Feature, IReadOnlySet<Guid>> HostOff)
{
    public static readonly PlatformValues Empty = new(
        new Dictionary<Feature, FeatureMode>(),
        new Dictionary<Feature, IReadOnlySet<Guid>>(),
        new Dictionary<Feature, IReadOnlySet<Guid>>());

    /// <summary>The kinds an Owner switched off for everyone (L2-171).</summary>
    public IReadOnlySet<NotificationKind> KindsOff { get; init; } = new HashSet<NotificationKind>();

    /// <summary>The limits an Owner changed; any other holds its default (L2-117 AC2, L2-176 AC1).</summary>
    public IReadOnlyDictionary<LimitKey, int> Limits { get; init; } = new Dictionary<LimitKey, int>();

    /// <summary>The Popkins with an active hold (L2-172).</summary>
    public IReadOnlySet<Guid> HeldPopkins { get; init; } = new HashSet<Guid>();

    public bool IsOffered(Feature feature, Guid popkinId) => Modes.GetValueOrDefault(feature, FeatureMode.Off) switch
    {
        FeatureMode.Everyone => true,
        FeatureMode.Chosen => Chosen.TryGetValue(feature, out var popkins) && popkins.Contains(popkinId),
        _ => false,
    };

    public bool IsOfferedToNew(Feature feature) => Modes.GetValueOrDefault(feature, FeatureMode.Off) == FeatureMode.Everyone;

    public bool IsSwitchedOffByHost(Feature feature, Guid popkinId) =>
        HostOff.TryGetValue(feature, out var popkins) && popkins.Contains(popkinId);
}
