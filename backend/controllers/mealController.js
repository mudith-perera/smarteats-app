
const meals = [
  {
    name: "Grilled Cheese Sandwich",
    ingredients: ["bread", "cheese", "butter"],
    steps: "Grill bread with cheese and butter."
  },
  {
    name: "Chicken Rice",
    ingredients: ["chicken", "rice"],
    steps: "Cook rice and chicken together with spices."
  },
  {
    name: "Salad",
    ingredients: ["lettuce", "tomato", "cucumber"],
    steps: "Mix lettuce, tomato, and cucumber with dressing."
  }
];

exports.suggestMeals = (req, res) => {
  const { ingredients } = req.body;

  if (!ingredients || ingredients.length === 0) {
    return res.status(400).json({ message: "No ingredients provided" });
  }

  const suggestions = meals.filter(meal =>
    meal.ingredients.every(ing => ingredients.includes(ing))
  );

  res.json(suggestions);
};

exports.addMeal = (req, res) => {
  const meal = req.body;
  meals.push(meal);
  res.status(201).json(meal);
};

