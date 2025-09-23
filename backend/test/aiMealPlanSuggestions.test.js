process.env.NODE_ENV = "test";
const { expect } = require("chai");

const mealPlanController = require("../controllers/mealPlanController");
const MealPlan = require("../models/MealPlan");
const User = require("../models/User");
const Profile = require("../models/Profile");

const createResponse = () => {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };

  return res;
};

const profileFixture = {
  _id: "profile-1",
  dietaryPreferences: ["vegan"],
  goal: "muscle-gain",
};

describe("mealPlanController.suggestedMealPlans", () => {
  const originalEnv = {
    AI_RANKER_CANDIDATE_LIMIT: process.env.AI_RANKER_CANDIDATE_LIMIT,
    SUGGESTED_MEALPLAN_LIMIT: process.env.SUGGESTED_MEALPLAN_LIMIT,
  };

  const originalFns = {
    userFindById: User.findById,
    profileFindOne: Profile.findOne,
    mealPlanFind: MealPlan.find,
    mealPlanAggregate: MealPlan.aggregate,
  };

  beforeEach(() => {
    process.env.AI_RANKER_CANDIDATE_LIMIT = "3";
    process.env.SUGGESTED_MEALPLAN_LIMIT = "3";

    User.findById = () => ({
      select: () => ({
        lean: async () => ({ profile: { _id: profileFixture._id } }),
      }),
    });

    Profile.findOne = () => ({
      sort: () => ({ lean: async () => profileFixture }),
      lean: async () => profileFixture,
    });
  });

  afterEach(() => {
    process.env.AI_RANKER_CANDIDATE_LIMIT = originalEnv.AI_RANKER_CANDIDATE_LIMIT;
    process.env.SUGGESTED_MEALPLAN_LIMIT = originalEnv.SUGGESTED_MEALPLAN_LIMIT;

    User.findById = originalFns.userFindById;
    Profile.findOne = originalFns.profileFindOne;
    MealPlan.find = originalFns.mealPlanFind;
    MealPlan.aggregate = originalFns.mealPlanAggregate;

    mealPlanController.__resetRankMealPlanService();
  });

  it("orders meal plans according to AI ranking and surfaces rationales", async () => {
    const candidatePlans = [
      { _id: "plan-a", title: "A", dietTags: ["vegan"], goalType: "muscle-gain" },
      { _id: "plan-b", title: "B", dietTags: ["vegan"], goalType: "muscle-gain" },
      { _id: "plan-c", title: "C", dietTags: ["vegan"], goalType: "muscle-gain" },
    ];

    const candidateLimit = Number(process.env.AI_RANKER_CANDIDATE_LIMIT);

    MealPlan.find = () => {
      const chain = {
        limitValue: null,
        sort() {
          return chain;
        },
        limit(value) {
          chain.limitValue = value;
          return chain;
        },
        async lean() {
          if (chain.limitValue === candidateLimit) {
            return candidatePlans;
          }
          return [];
        },
      };
      return chain;
    };

    let aggregateCalls = 0;
    MealPlan.aggregate = async () => {
      aggregateCalls += 1;
      return [];
    };

    mealPlanController.__setRankMealPlanService(async () => [
      { id: "plan-b", rationale: "Higher protein for muscle recovery." },
      { id: "plan-a" },
      { id: "plan-c" },
    ]);

    const req = { user: { id: "user-1" } };
    const res = createResponse();

    await mealPlanController.suggestedMealPlans(req, res);

    expect(res.statusCode).to.equal(200);
    expect(res.body.items.map((item) => item._id)).to.deep.equal([
      "plan-b",
      "plan-a",
      "plan-c",
    ]);
    expect(res.body.items[0].aiRationale).to.equal(
      "Higher protein for muscle recovery."
    );
    expect(res.body.ai.used).to.be.true;
    expect(res.body.ai.error).to.be.null;
    expect(aggregateCalls).to.equal(0);
  });

  it("falls back to preference ordering when AI ranking fails", async () => {
    const candidatePlans = [
      { _id: "plan-x", title: "X", dietTags: ["vegan"], goalType: "muscle-gain" },
      { _id: "plan-y", title: "Y", dietTags: ["vegan"], goalType: "muscle-gain" },
    ];

    const candidateLimit = Number(process.env.AI_RANKER_CANDIDATE_LIMIT);

    MealPlan.find = () => {
      const chain = {
        limitValue: null,
        sort() {
          return chain;
        },
        limit(value) {
          chain.limitValue = value;
          return chain;
        },
        async lean() {
          if (chain.limitValue === candidateLimit) {
            return candidatePlans;
          }
          return [{ _id: "recent-1", title: "Recent" }];
        },
      };
      return chain;
    };

    let aggregateCalls = 0;
    MealPlan.aggregate = async () => {
      aggregateCalls += 1;
      if (aggregateCalls === 1) {
        return [];
      }
      return [
        {
          _id: "plan-y",
          title: "Y",
          dietTags: ["vegan"],
          goalType: "muscle-gain",
          score: 5,
        },
        {
          _id: "plan-x",
          title: "X",
          dietTags: ["vegan"],
          goalType: "muscle-gain",
          score: 3,
        },
      ];
    };

    mealPlanController.__setRankMealPlanService(async () => {
      throw new Error("LLM offline");
    });

    const req = { user: { id: "user-2" } };
    const res = createResponse();

    await mealPlanController.suggestedMealPlans(req, res);

    expect(res.statusCode).to.equal(200);
    expect(res.body.ai.used).to.be.false;
    expect(res.body.ai.error).to.equal("LLM offline");
    expect(res.body.items.map((item) => item._id)).to.deep.equal([
      "plan-y",
      "plan-x",
    ]);
    res.body.items.forEach((item) => expect(item.aiRationale).to.equal(null));
    expect(aggregateCalls).to.equal(2);
  });
});
