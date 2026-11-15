using Microsoft.Extensions.Configuration;
using Popkin.Application.Abstractions;

namespace Popkin.Infrastructure.Features;

/// <summary>
/// The switches as API settings, `Features:{Feature}`, each off unless it is <c>true</c>
/// (ADR 0023). The configuration is read at each call.
/// </summary>
public sealed class SettingsFeatureSwitches(IConfiguration configuration) : IFeatureSwitches
{
    public bool IsOn(Feature feature) =>
        bool.TryParse(configuration[$"Features:{feature}"], out var on) && on;
}
