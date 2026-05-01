ALTER TYPE mini_e_commerce."OrderStatus" ADD VALUE IF NOT EXISTS 'RETURN_REQUESTED';
ALTER TYPE mini_e_commerce."OrderStatus" ADD VALUE IF NOT EXISTS 'RETURNED';

ALTER TYPE mini_e_commerce."NotifType" ADD VALUE IF NOT EXISTS 'ORDER_RETURNED';

CREATE TABLE IF NOT EXISTS mini_e_commerce."SliderImage" (
  "id" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "alt" TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SliderImage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SliderImage_active_idx" ON mini_e_commerce."SliderImage"("active");
CREATE INDEX IF NOT EXISTS "SliderImage_order_idx" ON mini_e_commerce."SliderImage"("order");
