-- Add PostMediaType enum + mediaType columns for Reels/Stories/Video support

CREATE TYPE "PostMediaType" AS ENUM ('IMAGE', 'VIDEO', 'REEL', 'STORY', 'CAROUSEL');

ALTER TABLE "Post" ADD COLUMN "mediaType" "PostMediaType" NOT NULL DEFAULT 'IMAGE';
ALTER TABLE "PostPlatform" ADD COLUMN "mediaType" "PostMediaType" NOT NULL DEFAULT 'IMAGE';
