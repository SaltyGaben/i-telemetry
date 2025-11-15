import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
	drivers: defineTable({
		userName: v.string(),
		teamName: v.string(),
		carIdx: v.number(),
		userID: v.number()
	})
		.index('by_carIdx', ['carIdx'])
		.index('by_userID', ['userID']),
	telemetry_team: defineTable({
		userID: v.number(),
		userName: v.string(),
		carIdx: v.number(),
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
		.index('by_carIdx', ['carIdx'])
		.index('by_userID', ['userID']),
	telemetry_all: defineTable({
		carIdx: v.number(),
		lap: v.number(),
		lapsCompleted: v.number(),
		position: v.number(),
		positionClass: v.number(),
		lastLapTime: v.number(),
		bestLapTime: v.number(),
		class: v.number()
	}).index('by_carIdx', ['carIdx'])
})
