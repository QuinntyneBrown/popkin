using System.Text.Json.Serialization;
using Popkin.Application.Abstractions;
using Popkin.Application.Invites;
using Popkin.Domain;

namespace Popkin.Application.Calls;

/// <summary>
/// A group call under way: when it started, how many are on it, and the version that count was
/// reached at. The running time counts from `StartedAt` (L2-029 AC5).
/// </summary>
public sealed record CallDto(Guid Id, DateTimeOffset StartedAt, long Version, int ParticipantCount)
{
    public static CallDto Of(Call call, int participantCount) => new(call.Id, call.StartedAt, call.Version, participantCount);
}

/// <summary>
/// A member on a call as the others see them: their first name for the tile, the name they go
/// by, their avatar, and whether their microphone and camera are on. Never a phone number or an
/// email (L2-054 AC2).
/// </summary>
public sealed record CallParticipantDto(
    Guid MembershipId, string FirstName, string Name, AvatarDto Avatar, bool MicOn, bool CameraOn, long MediaVersion, DateTimeOffset JoinedAt)
{
    public static CallParticipantDto Of(CallParticipant participant, Membership membership, IPhotoStore photos) =>
        new(
            membership.Id,
            PersonName.FirstName(membership.DisplayName),
            membership.DisplayName,
            AvatarDto.Of(membership, photos),
            participant.MicOn,
            participant.CameraOn,
            participant.MediaVersion,
            participant.JoinedAt);
}

/// <summary>A STUN or TURN server as the browser's `RTCPeerConnection` takes it; a STUN server carries no credential.</summary>
public sealed record IceServerDto(
    IReadOnlyList<string> Urls,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? Username = null,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? Credential = null);

/// <summary>
/// What a member needs once they are on a call: the call, which participant they are, everyone
/// on it in the order they joined, and the media relay to reach them through.
/// </summary>
public sealed record JoinedCallDto(
    CallDto Call, Guid ViewerMembershipId, IReadOnlyList<CallParticipantDto> Participants, IReadOnlyList<IceServerDto> IceServers);
