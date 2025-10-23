import { mutation } from "./_generated/server"
import { v } from "convex/values"

export const upsertDrivers = mutation({
    args: {
        drivers: v.array(
            v.object({
                userName: v.string(),
                teamName: v.string(),
                carIdx: v.number(),
            })
        ),
    },
    handler: async (ctx, args) => {
        for (const driver of args.drivers) {
            const existing = await ctx.db
                .query("drivers")
                .filter(q => q.eq(q.field("carIdx"), driver.carIdx))
                .first()

            if (existing) {
                await ctx.db.patch(existing._id, driver)
            } else {
                await ctx.db.insert("drivers", driver)
            }
        }
    },
})
