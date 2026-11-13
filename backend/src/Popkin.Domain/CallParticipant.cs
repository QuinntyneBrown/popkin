namespace Popkin.Domain;

/// <summary>
/// A member's time on a call, from joining to leaving. They are on the call while
/// <see cref="LeftAt"/> is empty; a member who comes back is a new participant.
/// </summary>
public sealed class CallParticipant
{
    private CallParticipant()
    {
    }

    public Guid Id { get; private set; }

    public Guid CallId { get; private set; }

    public Guid MembershipId { get; private set; }

    public DateTimeOffset JoinedAt { get; private set; }

    public DateTimeOffset? LeftAt { get; private set; }

    public bool MicOn { get; private set; }

    public bool CameraOn { get; private set; }

    /// <summary>Rises with every change of the microphone or the camera, so a client can drop an older `ParticipantMediaChanged`.</summary>
    public long MediaVersion { get; private set; }

    /// <summary>The hub connection that is sent this participant's signals; empty until it joins the call's group.</summary>
    public string? ConnectionId { get; private set; }

    internal static CallParticipant Join(Guid callId, Guid membershipId, bool micOn, bool cameraOn, DateTimeOffset now) => new()
    {
        Id = Guid.NewGuid(),
        CallId = callId,
        MembershipId = membershipId,
        JoinedAt = now,
        MicOn = micOn,
        CameraOn = cameraOn,
    };

    /// <summary>The connection the participant is on the call with from now on.</summary>
    public void Connect(string connectionId) => ConnectionId = connectionId;

    internal void Leave(DateTimeOffset now) => LeftAt = now;
}
