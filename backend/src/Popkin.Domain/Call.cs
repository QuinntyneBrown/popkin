namespace Popkin.Domain;

/// <summary>
/// A video call of one Popkin: its group call, open to every member (L2-029), or the direct
/// call of one direct message, open to its two members only (L2-030 AC8). It is under way while
/// <see cref="EndedAt"/> is empty; a Popkin has at most one group call under way, and a direct
/// message at most one direct call, and the two kinds run at once. The API keeps who is on it
/// and never carries its media.
/// </summary>
public sealed class Call
{
    private Call()
    {
    }

    public Guid Id { get; private set; }

    public Guid PopkinId { get; private set; }

    /// <summary>The direct message whose call this is; null for the Popkin's group call.</summary>
    public Guid? ThreadId { get; private set; }

    public DateTimeOffset StartedAt { get; private set; }

    public DateTimeOffset? EndedAt { get; private set; }

    /// <summary>
    /// Rises with every change to who is on the call, so a client can drop an older
    /// `CallChanged`. Two changes at once cannot both be saved from the same version.
    /// </summary>
    public long Version { get; private set; }

    /// <summary>
    /// Starts a call with nobody on it yet: the group call, or with a thread the direct call of
    /// that direct message. Whoever starts it joins it next.
    /// </summary>
    public static Call Start(Guid popkinId, DateTimeOffset now, Guid? threadId = null) => new()
    {
        Id = Guid.NewGuid(),
        PopkinId = popkinId,
        ThreadId = threadId,
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

    /// <summary>
    /// Ends the call for everyone on it, because its Popkin wrapped up: no call outlives its
    /// Popkin (L2-045 AC1).
    /// </summary>
    public void End(IEnumerable<CallParticipant> on, DateTimeOffset now)
    {
        foreach (var participant in on)
        {
            if (participant.CallId != Id)
            {
                throw new ArgumentException("A participant is on another call.", nameof(on));
            }

            participant.Leave(now);
        }

        Version++;
        EndedAt = now;
    }
}
