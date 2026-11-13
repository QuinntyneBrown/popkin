namespace Popkin.Domain;

/// <summary>
/// A group call: a video call open to every member of one Popkin (L2-029). It is under way
/// while <see cref="EndedAt"/> is empty, and a Popkin has at most one under way. The API keeps
/// who is on it and never carries its media.
/// </summary>
public sealed class Call
{
    private Call()
    {
    }

    public Guid Id { get; private set; }

    public Guid PopkinId { get; private set; }

    public DateTimeOffset StartedAt { get; private set; }

    public DateTimeOffset? EndedAt { get; private set; }

    /// <summary>
    /// Rises with every change to who is on the call, so a client can drop an older
    /// `CallChanged`. Two changes at once cannot both be saved from the same version.
    /// </summary>
    public long Version { get; private set; }

    /// <summary>Starts a call with nobody on it yet; whoever starts it joins it next.</summary>
    public static Call Start(Guid popkinId, DateTimeOffset now) => new()
    {
        Id = Guid.NewGuid(),
        PopkinId = popkinId,
        StartedAt = now,
    };

    /// <summary>A member comes onto the call.</summary>
    public CallParticipant Join(Guid membershipId, bool micOn, bool cameraOn, DateTimeOffset now)
    {
        Version++;
        return CallParticipant.Join(Id, membershipId, micOn, cameraOn, now);
    }

    /// <summary>A participant leaves; when they were the last one on it, the call ends (L2-029 AC6).</summary>
    public void Leave(CallParticipant participant, bool last, DateTimeOffset now)
    {
        if (participant.CallId != Id)
        {
            throw new ArgumentException("The participant is on another call.", nameof(participant));
        }

        participant.Leave(now);
        Version++;
        if (last)
        {
            EndedAt = now;
        }
    }
}
