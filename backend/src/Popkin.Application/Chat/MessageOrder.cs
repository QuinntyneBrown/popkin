using Popkin.Domain;

namespace Popkin.Application.Chat;

/// <summary>A message's place in its thread: its time, then its id.</summary>
public readonly record struct MessagePoint(DateTimeOffset SentAt, Guid Id);

/// <summary>
/// The order of a thread, by `(SentAt, Id)`, as queries the database runs through the index
/// `(ThreadId, SentAt, Id)`. Messages are ordered by it and never by arrival.
/// </summary>
public static class MessageOrder
{
    public static IOrderedQueryable<Message> Oldest(this IQueryable<Message> messages) =>
        messages.OrderBy(m => m.SentAt).ThenBy(m => m.Id);

    public static IOrderedQueryable<Message> Newest(this IQueryable<Message> messages) =>
        messages.OrderByDescending(m => m.SentAt).ThenByDescending(m => m.Id);

    public static IQueryable<Message> Before(this IQueryable<Message> messages, MessagePoint point) =>
        messages.Where(m => m.SentAt < point.SentAt || (m.SentAt == point.SentAt && m.Id.CompareTo(point.Id) < 0));

    public static IQueryable<Message> After(this IQueryable<Message> messages, MessagePoint point) =>
        messages.Where(m => m.SentAt > point.SentAt || (m.SentAt == point.SentAt && m.Id.CompareTo(point.Id) > 0));

    public static IQueryable<Message> From(this IQueryable<Message> messages, MessagePoint point) =>
        messages.Where(m => m.SentAt > point.SentAt || (m.SentAt == point.SentAt && m.Id.CompareTo(point.Id) >= 0));

    public static IQueryable<Message> UpTo(this IQueryable<Message> messages, MessagePoint point) =>
        messages.Where(m => m.SentAt < point.SentAt || (m.SentAt == point.SentAt && m.Id.CompareTo(point.Id) <= 0));
}
