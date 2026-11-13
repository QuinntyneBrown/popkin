using System.Buffers.Text;
using System.Security.Cryptography;
using System.Text;

namespace Popkin.Application.Photos;

/// <summary>
/// Signs the address a stored file is read from, for a store with no signed addresses of its
/// own. The address names the key and when it expires, and carries an HMAC of both, so it cannot
/// be guessed, changed or used after it expires (L2-051 AC2).
/// </summary>
public sealed class PhotoUrlSigner(byte[] signingKey, TimeProvider clock)
{
    public static readonly TimeSpan Lifetime = TimeSpan.FromHours(1);

    public string ReadUrl(string key)
    {
        var expires = clock.GetUtcNow().Add(Lifetime).ToUnixTimeSeconds();
        return $"/api/files/{key}?expires={expires}&signature={Sign(key, expires, null)}";
    }

    /// <summary>An address the file downloads from under that file name; the name is signed with the rest.</summary>
    public string DownloadUrl(string key, string fileName)
    {
        var expires = clock.GetUtcNow().Add(Lifetime).ToUnixTimeSeconds();
        return $"/api/files/{key}?expires={expires}&download={Uri.EscapeDataString(fileName)}&signature={Sign(key, expires, fileName)}";
    }

    public bool IsValid(string key, long expires, string? signature, string? download = null)
    {
        if (signature is null || clock.GetUtcNow().ToUnixTimeSeconds() >= expires)
        {
            return false;
        }

        return CryptographicOperations.FixedTimeEquals(Encoding.ASCII.GetBytes(Sign(key, expires, download)), Encoding.ASCII.GetBytes(signature));
    }

    private string Sign(string key, long expires, string? download) =>
        Base64Url.EncodeToString(HMACSHA256.HashData(
            signingKey, Encoding.UTF8.GetBytes(download is null ? $"{key}\n{expires}" : $"{key}\n{expires}\n{download}")));
}
