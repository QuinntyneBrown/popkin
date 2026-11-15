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
public sealed class PlatformSnapshot(IServiceScopeFactory scopes, TimeProvider clock) : IFeatureSwitches, IPlatformSnapshot
{
    public static readonly TimeSpan RefreshAfter = TimeSpan.FromSeconds(30);

    private readonly SemaphoreSlim _loading = new(1, 1);
    private volatile PlatformValues _values = PlatformValues.Empty;
    private DateTimeOffset? _loadedAt;
    private volatile bool _stale = true;

    public bool IsOn(Feature feature, Guid popkinId) => _values.IsOn(feature, popkinId);

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
            _values = new PlatformValues(
                modes,
                chosen.GroupBy(c => c.Feature).ToDictionary(g => g.Key, g => (IReadOnlySet<Guid>)g.Select(c => c.PopkinId).ToHashSet()));
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

/// <summary>One immutable reading of the switches: each feature's mode and its chosen Popkins.</summary>
public sealed record PlatformValues(
    IReadOnlyDictionary<Feature, FeatureMode> Modes,
    IReadOnlyDictionary<Feature, IReadOnlySet<Guid>> Chosen)
{
    public static readonly PlatformValues Empty = new(new Dictionary<Feature, FeatureMode>(), new Dictionary<Feature, IReadOnlySet<Guid>>());

    public bool IsOn(Feature feature, Guid popkinId) => Modes.GetValueOrDefault(feature, FeatureMode.Off) switch
    {
        FeatureMode.Everyone => true,
        FeatureMode.Chosen => Chosen.TryGetValue(feature, out var popkins) && popkins.Contains(popkinId),
        _ => false,
    };
}
