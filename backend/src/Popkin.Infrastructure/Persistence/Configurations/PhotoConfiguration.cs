using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Popkin.Domain;

namespace Popkin.Infrastructure.Persistence.Configurations;

public sealed class PhotoConfiguration : IEntityTypeConfiguration<Photo>
{
    public void Configure(EntityTypeBuilder<Photo> builder)
    {
        builder.ToTable("Photos");
        builder.HasKey(p => p.Id);
        builder.Property(p => p.Caption).HasMaxLength(Photo.MaxCaptionLength);
        builder.Property(p => p.StorageKey).HasMaxLength(200).IsRequired();
        builder.Property(p => p.ThumbnailKey).HasMaxLength(200).IsRequired();
        builder.Property(p => p.ContentType).HasMaxLength(50).IsRequired();
        // The album is read by the time a photo was taken, then its id.
        builder.HasIndex(p => new { p.PopkinId, p.TakenAt, p.Id });
        // `ThreadId` has no foreign key: the thread and the photo both go with their Popkin, and
        // SQL Server allows one cascade path only.
        builder.HasOne<PopkinSpace>().WithMany().HasForeignKey(p => p.PopkinId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<Membership>().WithMany().HasForeignKey(p => p.UploaderMembershipId).OnDelete(DeleteBehavior.Restrict);
    }
}

public sealed class PhotoReactionConfiguration : IEntityTypeConfiguration<PhotoReaction>
{
    public void Configure(EntityTypeBuilder<PhotoReaction> builder)
    {
        builder.ToTable("PhotoReactions");
        // One reaction per member, photo and emoji, even when two requests race (L2-034).
        builder.HasKey(r => new { r.PhotoId, r.MembershipId, r.Emoji });
        builder.Property(r => r.Emoji).HasMaxLength(MessageReaction.MaxEmojiLength);
        // The reactions go with their photo (L2-036 AC3).
        builder.HasOne<Photo>().WithMany().HasForeignKey(r => r.PhotoId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<Membership>().WithMany().HasForeignKey(r => r.MembershipId).OnDelete(DeleteBehavior.Restrict);
    }
}

public sealed class PhotoCommentConfiguration : IEntityTypeConfiguration<PhotoComment>
{
    public void Configure(EntityTypeBuilder<PhotoComment> builder)
    {
        builder.ToTable("PhotoComments");
        builder.HasKey(c => c.Id);
        builder.Property(c => c.Text).HasMaxLength(PhotoComment.MaxTextLength).IsRequired();
        // A photo's comments are read oldest first.
        builder.HasIndex(c => new { c.PhotoId, c.AddedAt });
        // The comments go with their photo (L2-036 AC3).
        builder.HasOne<Photo>().WithMany().HasForeignKey(c => c.PhotoId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<Membership>().WithMany().HasForeignKey(c => c.AuthorMembershipId).OnDelete(DeleteBehavior.Restrict);
    }
}
