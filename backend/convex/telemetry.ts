import { mutation } from "./_generated/server"
import { v } from "convex/values"

export const addTelemetry = mutation({
    args: {
        telemetryTeam: v.optional(
            v.object({
                carIdx: v.number(),
                lap: v.number(),
                fuelLevel: v.number(),
                incidentsTeam: v.number(),
                incidentsDriver: v.number(),
                bestLapTime: v.number(),
                lastLapTime: v.number(),
                position: v.number(),
                positionClass: v.number(),
                lapsCompleted: v.number(),
            })
        ),
        telemetryAll: v.optional(
            v.array(
                v.object({
                    carIdx: v.number(),
                    lap: v.number(),
                    lapsCompleted: v.number(),
                    position: v.number(),
                    positionClass: v.number(),
                    lastLapTime: v.number(),
                    bestLapTime: v.number(),
                })
            )
        ),
    },
    handler: async (ctx, args) => {
        if (args.telemetryTeam) {
            await ctx.db.insert("telemetry_team", args.telemetryTeam)
        }

        if (args.telemetryAll) {
            for (const car of args.telemetryAll) {
                const existing = await ctx.db
                    .query("telemetry_all")
                    .filter(q => q.eq(q.field("carIdx"), car.carIdx))
                    .first()

                if (existing) {
                    await ctx.db.patch(existing._id, car)
                } else {
                    await ctx.db.insert("telemetry_all", car)
                }
            }
        }
    },
})
