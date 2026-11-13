using Popkin.Domain;

namespace Popkin.Application.Tests.WrapUp;

/// <summary>`PopkinSpace.WrapUp` and when the photos go (L2-043 AC2, L2-045 AC4), one case per row.</summary>
public sealed class PopkinSpaceWrapUpTests
{
    private static readonly DateTimeOffset Now = new(2026, 9, 13, 18, 0, 0, TimeSpan.Zero);

    private static PopkinSpace Lakeside()
    {
        var mara = Person.Create("Mara Okafor", ContactChannel.Email, "mara@example.com", Now.AddDays(-2));
        return PopkinSpace.Start(mara, "Lakeside Weekend", "🏕️", PopkinColour.Teal, Now.AddDays(1), "lakeside1", Now.AddDays(-2)).Popkin;
    }

    [Fact]
    public void An_active_Popkin_has_no_date_for_its_photos_to_go()
    {
        var popkin = Lakeside();

        Assert.Equal(PopkinStatus.Active, popkin.Status);
        Assert.Null(popkin.WrappedUpAt);
        Assert.Null(popkin.PhotosRemoveAt);
    }

    [Fact]
    public void Wrapped_up_with_the_album_kept_the_photos_stay()
    {
        var popkin = Lakeside();

        popkin.WrapUp(Now, keepPhotos: true);

        Assert.Equal(PopkinStatus.WrappedUp, popkin.Status);
        Assert.Equal(Now, popkin.WrappedUpAt);
        Assert.True(popkin.KeepPhotos);
        Assert.Null(popkin.PhotosRemoveAt);
    }

    [Fact]
    public void Wrapped_up_without_the_album_kept_the_photos_go_30_days_later()
    {
        var popkin = Lakeside();

        popkin.WrapUp(Now, keepPhotos: false);

        Assert.False(popkin.KeepPhotos);
        Assert.Equal(Now.AddDays(30), popkin.PhotosRemoveAt);
    }

    [Fact]
    public void A_Popkin_that_has_wrapped_up_does_not_wrap_up_again()
    {
        var popkin = Lakeside();
        popkin.WrapUp(Now, keepPhotos: true);

        Assert.Throws<InvalidOperationException>(() => popkin.WrapUp(Now.AddHours(1), keepPhotos: false));

        Assert.Equal(Now, popkin.WrappedUpAt);
        Assert.True(popkin.KeepPhotos);
    }
}
