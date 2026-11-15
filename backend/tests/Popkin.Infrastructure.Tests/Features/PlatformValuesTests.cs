using Popkin.Domain;
using Popkin.Infrastructure.Features;

namespace Popkin.Infrastructure.Tests.Features;

/// <summary>
/// A feature is on for a Popkin only while the admin app offers it and its Host has it switched
/// on (ADR 0026, L2-077, L2-152, L2-153); a new Popkin is offered it only while it is on for
/// Everyone (L2-152 AC8).
/// </summary>
public sealed class PlatformValuesTests
{
    private static readonly Guid Lakeside = Guid.NewGuid();
    private static readonly Guid Other = Guid.NewGuid();

    private static PlatformValues Values(FeatureMode mode, bool chosen, bool hostOff) => new(
        new Dictionary<Feature, FeatureMode> { [Feature.Plan] = mode },
        new Dictionary<Feature, IReadOnlySet<Guid>> { [Feature.Plan] = chosen ? new HashSet<Guid> { Lakeside } : new HashSet<Guid> { Other } },
        new Dictionary<Feature, IReadOnlySet<Guid>> { [Feature.Plan] = hostOff ? new HashSet<Guid> { Lakeside } : new HashSet<Guid>() });

    [Theory]
    [InlineData(FeatureMode.Off, false, false, false, false)]
    [InlineData(FeatureMode.Off, false, true, false, false)]
    [InlineData(FeatureMode.Chosen, false, false, false, false)]
    [InlineData(FeatureMode.Chosen, true, false, true, true)]
    [InlineData(FeatureMode.Chosen, true, true, true, false)]
    [InlineData(FeatureMode.Everyone, false, false, true, true)]
    [InlineData(FeatureMode.Everyone, false, true, true, false)]
    public void A_feature_is_on_only_while_offered_and_switched_on_by_the_Host(
        FeatureMode mode, bool chosen, bool hostOff, bool offered, bool on)
    {
        var values = Values(mode, chosen, hostOff);

        Assert.Equal(offered, values.IsOffered(Feature.Plan, Lakeside));
        Assert.Equal(on, values.IsOffered(Feature.Plan, Lakeside) && !values.IsSwitchedOffByHost(Feature.Plan, Lakeside));
    }

    [Theory]
    [InlineData(FeatureMode.Off, false)]
    [InlineData(FeatureMode.Chosen, false)]
    [InlineData(FeatureMode.Everyone, true)]
    public void A_new_Popkin_is_offered_a_feature_only_while_it_is_on_for_everyone(FeatureMode mode, bool offered)
    {
        Assert.Equal(offered, Values(mode, chosen: true, hostOff: false).IsOfferedToNew(Feature.Plan));
    }

    [Fact]
    public void A_feature_without_a_switch_is_offered_to_nobody()
    {
        Assert.False(PlatformValues.Empty.IsOffered(Feature.Schedules, Lakeside));
        Assert.False(PlatformValues.Empty.IsOfferedToNew(Feature.Schedules));
    }
}
