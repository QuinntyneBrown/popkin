namespace Popkin.Application.Abstractions;

/// <summary>Keys and hashes codes so only a hash is stored (L2-054 AC4).</summary>
public interface ICodeHasher
{
    string Hash(string code);

    /// <summary>Compares in constant time.</summary>
    bool Matches(string code, string hash);
}
