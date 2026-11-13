using Popkin.Application.Photos;
using Popkin.Domain;

namespace Popkin.Application.Tests.Photos;

/// <summary>When a photo was taken, read from what its file says, and how the album keeps it (L2-031, L2-032 AC1).</summary>
public sealed class CaptureTimeTests
{
    [Theory]
    // The time with the offset the file gives.
    [InlineData("2026:11:07 07:02:00", "-08:00", "2026-11-07T15:02:00Z")]
    [InlineData("2026:11:07 07:02:00", "+05:30", "2026-11-07T01:32:00Z")]
    [InlineData("2026:11:07 07:02:00", "+00:00", "2026-11-07T07:02:00Z")]
    [InlineData(" 2026:11:07 07:02:00 ", " -08:00 ", "2026-11-07T15:02:00Z")]
    // No offset, or one that cannot be read: the time is taken as UTC.
    [InlineData("2026:11:07 07:02:00", null, "2026-11-07T07:02:00Z")]
    [InlineData("2026:11:07 07:02:00", "", "2026-11-07T07:02:00Z")]
    [InlineData("2026:11:07 07:02:00", "PST", "2026-11-07T07:02:00Z")]
    [InlineData("2026:11:07 07:02:00", "08:00", "2026-11-07T07:02:00Z")]
    [InlineData("2026:11:07 07:02:00", "+25:00", "2026-11-07T07:02:00Z")]
    // No time, or one that cannot be read: no capture time.
    [InlineData(null, null, null)]
    [InlineData(null, "-08:00", null)]
    [InlineData("", null, null)]
    [InlineData("0000:00:00 00:00:00", null, null)]
    [InlineData("    :  :     :  :  ", null, null)]
    [InlineData("2026-11-07T07:02:00", null, null)]
    [InlineData("2026:13:40 07:02:00", null, null)]
    [InlineData("yesterday", null, null)]
    [InlineData("0001:01:01 00:00:00", "+05:00", null)]
    public void The_time_a_file_gives_is_read_with_its_offset_or_as_UTC(string? dateTime, string? offset, string? expected)
    {
        var captured = CaptureTime.Parse(dateTime, offset);

        Assert.Equal(expected is null ? null : DateTimeOffset.Parse(expected), captured);
    }

    [Theory]
    // Taken before it was added: the capture time stands.
    [InlineData("2026-11-07T07:02:00Z", "2026-11-07T07:02:00Z")]
    [InlineData("2026-11-13T08:59:59Z", "2026-11-13T08:59:59Z")]
    // No capture time, or one that is not in the past: taken when it was added.
    [InlineData(null, "2026-11-13T09:00:00Z")]
    [InlineData("2026-11-13T09:00:00Z", "2026-11-13T09:00:00Z")]
    [InlineData("2026-11-13T09:00:01Z", "2026-11-13T09:00:00Z")]
    [InlineData("2099-01-01T00:00:00Z", "2026-11-13T09:00:00Z")]
    public void A_photo_is_never_taken_later_than_it_was_added(string? capturedAt, string expectedTakenAt)
    {
        var addedAt = DateTimeOffset.Parse("2026-11-13T09:00:00Z");

        var photo = Photo.Add(
            Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), caption: null,
            capturedAt is null ? null : DateTimeOffset.Parse(capturedAt), addedAt, "key.jpg", "key-thumbnail.jpg", 800, 600, "image/jpeg");

        Assert.Equal(DateTimeOffset.Parse(expectedTakenAt), photo.TakenAt);
        Assert.Equal(addedAt, photo.AddedAt);
    }
}
