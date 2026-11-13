using Popkin.Application.WrapUp;

namespace Popkin.Application.Tests.WrapUp;

/// <summary>The name the album's zip downloads under: the Popkin's name, made safe as a file name.</summary>
public sealed class AlbumZipNameTests
{
    [Theory]
    [InlineData("Lakeside Weekend", "Lakeside Weekend.zip")]
    [InlineData("Mum & Dad's 40th 🎉", "Mum & Dad's 40th 🎉.zip")]
    [InlineData("Fri/Sat: who's in?", "Fri-Sat- who's in-.zip")]
    [InlineData("a\\b*c\"d<e>f|g", "a-b-c-d-e-f-g.zip")]
    [InlineData("..", "Popkin.zip")]
    [InlineData(" . ", "Popkin.zip")]
    public void A_Popkins_name_becomes_a_file_name(string popkinName, string expected)
    {
        Assert.Equal(expected, AlbumExportFiles.ZipName(popkinName));
    }
}
