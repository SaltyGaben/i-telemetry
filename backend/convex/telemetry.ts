import { v } from 'convex/values'
import type { Doc } from './_generated/dataModel'
import { mutation, query } from './_generated/server'

export type TelemetryTeam = Doc<'telemetry_team'>
export type TelemetryAll = Doc<'telemetry_all'>

export const getTelemetryTeam = query({
	args: {},
	handler: async (ctx) => {
		return await ctx.db.query('telemetry_team').collect()
	}
})

export const getTelemetryAll = query({
	args: {},
	handler: async (ctx) => {
		return await ctx.db.query('telemetry_all').collect()
	}
})

export const addTelemetry = mutation({
	args: {
		telemetryTeam: v.optional(
			v.object({
				carIdx: v.number(),
				userID: v.number(),
				lap: v.number(),
				fuelLevel: v.number(),
				incidentsTeam: v.number(),
				incidentsDriver: v.number(),
				bestLapTime: v.number(),
				lastLapTime: v.number(),
				position: v.number(),
				positionClass: v.number(),
				lapsCompleted: v.number()
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
					class: v.number()
				})
			)
		)
	},
	handler: async (ctx, args) => {
		if (args.telemetryTeam) {
			await ctx.db.insert('telemetry_team', args.telemetryTeam)
		}

		if (args.telemetryAll) {
			for (const car of args.telemetryAll) {
				const existing = await ctx.db
					.query('telemetry_all')
					.filter((q) => q.eq(q.field('carIdx'), car.carIdx))
					.first()

				if (existing) {
					await ctx.db.patch(existing._id, car)
				} else {
					await ctx.db.insert('telemetry_all', car)
				}
			}
		}
	}
})
