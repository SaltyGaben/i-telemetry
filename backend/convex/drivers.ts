import { v } from 'convex/values'
import type { Doc } from './_generated/dataModel'
import { mutation, query } from './_generated/server'

export type Driver = Doc<'drivers'>

export const getDrivers = query({
	args: {},
	handler: async (ctx) => {
		return await ctx.db.query('drivers').collect()
	}
})

export const upsertDrivers = mutation({
	args: {
		drivers: v.array(
			v.object({
				userName: v.string(),
				teamName: v.string(),
				carIdx: v.number(),
				userID: v.number()
			})
		)
	},
	handler: async (ctx, args) => {
		for (const driver of args.drivers) {
			const existing = await ctx.db
				.query('drivers')
				.filter((q) => q.eq(q.field('carIdx'), driver.carIdx))
				.first()

			if (existing) {
				await ctx.db.patch(existing._id, driver)
			} else {
				await ctx.db.insert('drivers', driver)
			}
		}
	}
})
