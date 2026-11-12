using System.Security.Cryptography;
using Popkin.Application.Abstractions;

namespace Popkin.Infrastructure.Auth;

/// <summary>
/// Ten characters drawn with <see cref="RandomNumberGenerator"/> from an alphabet without the
/// characters that read alike (i, l, o, 0, 1), above the 8-character minimum of L2-011 AC5.
/// </summary>
public sealed class RandomInviteCodeGenerator : IInviteCodeGenerator
{
    private const string Alphabet = "abcdefghjkmnpqrstuvwxyz23456789";

    public string NewCode() => RandomNumberGenerator.GetString(Alphabet, 10);
}
