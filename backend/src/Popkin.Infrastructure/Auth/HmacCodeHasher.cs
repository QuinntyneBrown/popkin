using System.Security.Cryptography;
using System.Text;
using Popkin.Application.Abstractions;

namespace Popkin.Infrastructure.Auth;

/// <summary>HMAC-SHA-256 with a server key; codes are compared in constant time.</summary>
public sealed class HmacCodeHasher(byte[] key) : ICodeHasher
{
    public string Hash(string code) =>
        Convert.ToHexString(HMACSHA256.HashData(key, Encoding.UTF8.GetBytes(code)));

    public bool Matches(string code, string hash) =>
        CryptographicOperations.FixedTimeEquals(
            Encoding.ASCII.GetBytes(Hash(code)),
            Encoding.ASCII.GetBytes(hash));
}
