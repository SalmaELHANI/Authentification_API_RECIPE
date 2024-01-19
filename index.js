const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const User = require("./database/users");
const Recipes = require('./database/recipes');
const swaggerUi = require('swagger-ui-express');
const swaggerJsDoc = require('swagger-jsdoc');

require('dotenv').config();

const bcrypt = require('bcrypt');
const Joi = require('joi');
const { verifyToken, verifyTokenAndAuth } = require("./middleware/authMiddleware");

const app = express();
const port = 4000;
const secretKey = process.env.SECRET_KEY;
const connectionString = process.env.DB_CONNECTION_STRING;



const swaggerOptions = {
  definition: {
      openapi: '3.0.0',
      info: {
      title: 'My API',
      version: '1.0.0',
      description: 'A sample API for learning Swagger',
      },
      servers: [
      {
          url: 'http://localhost:4000/',
      },
      ],
  },
  apis: ['*.js'],
  };

app.use(express.json());


const startServer = async () => {
  try {
    await mongoose.connect(connectionString);
    console.log("Connection to the database successful");

    app.listen(port, () => {
      console.log("Server is running on port " + port);
    });
  } catch (error) {
    console.error("Error connecting to the database:", error.message);
  }
};

startServer();

const querySchema = Joi.object({
  name: Joi.string().required().min(2),
  email: Joi.string().email().required(),
  phone: Joi.string().min(10),
  password: Joi.string().required().min(8),
});

/**
 * @swagger
 * /registre:
 *   post:
 *     summary: Endpoint pour l'enregistrement d'un nouvel utilisateur.
 *     tags:
 *       - Utilisateurs
 *     requestBody:
 *       description: Données de l'utilisateur à enregistrer.
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Nom de l'utilisateur.
 *               email:
 *                 type: string
 *                 description: Adresse e-mail de l'utilisateur.
 *               phone:
 *                 type: string
 *                 description: Numéro de téléphone de l'utilisateur.
 *               password:
 *                 type: string
 *                 description: Mot de passe de l'utilisateur.
 *             example:
 *               name: John Doe
 *               email: john@example.com
 *               phone: +1234567890
 *               password: securePassword
 *     responses:
 *       201:
 *         description: Utilisateur créé avec succès.
 *       400:
 *         description: Mauvaise requête ou utilisateur déjà existant.
 *       500:
 *         description: Erreur interne du serveur.
 */


app.post("/register", async (req, res) => {
  try {
    const { error } = querySchema.validate(req.body);
    if (error) {
      res.status(400).json({ message: error.details[0].message });
      return;
    }
    const user = new User({
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      password: bcrypt.hashSync(req.body.password, 10),
    });
    const findUser = await User.findOne({ email: user.email });
    if (findUser) {
      return res.status(409).send('User already exists');
    }
    const savedUser = await user.save();
    console.log(savedUser);
    res.status(201).send("User Created");
  } catch (error) {
    console.error("Error during user registration:", error);
    res.status(500).send("Server Error");
  }
});

/**
 * @swagger
 * /login:
 *   post:
 *     summary: Authentification de l'utilisateur.
 *     requestBody:
 *       description: Les informations d'identification de l'utilisateur.
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 description: Adresse e-mail de l'utilisateur.
 *               password:
 *                 type: string
 *                 description: Mot de passe de l'utilisateur.
 *             example:
 *               email: john@example.com
 *               password: securePassword
 *     responses:
 *       200:
 *         description: Authentification réussie. Retourne un token JWT.
 *         content:
 *           application/json:
 *             example:
 *               token: "jwt_token_here"
 *       401:
 *         description: Identifiant ou mot de passe incorrect.
 *       500:
 *         description: Erreur interne du serveur lors de l'authentification.
 */

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    const passwordIsValid = await bcrypt.compare(password, user.password);

    if (!passwordIsValid || !user) {
      return res.send("Username or Password is not correct!");
    }

    jwt.sign({
        id: user._id,
        name:user.username,
        email: user.email
        }, secretKey,{expiresIn : "1d"} ,(err, token) => {
      if (err) {
        return res.json({ error: err });
      } else {
        res.json({ token });
      }
    });
  } catch (error) {
    console.error("Error during authentication:", error.message);
    res.status(500).send("Internal Server Error");
  }
});


app.put("/user/:id", verifyTokenAndAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const findUser = await User.findOne({ id });

    if (!findUser) {
      res.status(404).send('User not found');
      return;
    }

    const updateUser = await Recipes.findOneAndUpdate(
      { id },
      {
        name: req.body.name,
        email: req.body.email,
        phone: req.body.phone,
        password: bcrypt.hashSync(req.body.password, 10),
      },
      { new: true },
    );
    res.send(updateUser);

  } catch (err) {
    console.log(err);
    res.send(err);
  }
});

/**
 * @swagger
 * /recipes:
 *   get:
 *     summary: Get all recipes
 *     description: Retrieve a list of all recipes.
 *     tags:
 *       - Recipes
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Successful response with the list of recipes
 *         content:
 *           application/json:
 *             example:
 *               - _id: "1234567890"
 *                 category: "Dessert"
 *                 name: "Chocolate Cake"
 *                 description: "Delicious chocolate cake recipe"
 *                 ingredients: ["Flour", "Sugar", "Cocoa Powder"]
 *                 instructions: "..."
 *               - _id: "0987654321"
 *                 category: "Main Course"
 *                 name: "Spaghetti Bolognese"
 *                 description: "Classic spaghetti bolognese recipe"
 *                 ingredients: ["Ground Beef", "Tomato Sauce", "Spaghetti"]
 *                 instructions: "..."
 *       401:
 *         description: Unauthorized, missing or invalid token
 *       500:
 *         description: Internal Server Error
 */

app.get("/recipes", verifyToken, async (req, res) => {
  try {
    const result = await Recipes.find({});
    res.send(result);
  } catch (err) {
    console.log(err);
  }
});

/**
 * @swagger
 * /recipes:
 *   post:
 *     summary: Create a new recipe
 *     description: Create a new recipe with the provided details.
 *     tags:
 *       - Recipes
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       description: Recipe details to be created
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               category:
 *                 type: string
 *                 description: The category of the recipe.
 *               name:
 *                 type: string
 *                 description: The name of the recipe.
 *               description:
 *                 type: string
 *                 description: A description of the recipe.
 *               ingredients:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: An array of ingredients for the recipe.
 *               instructions:
 *                 type: string
 *                 description: Instructions to prepare the recipe.
 *     responses:
 *       201:
 *         description: Recipe successfully created
 *       400:
 *         description: Recipe with the same name already exists
 *       401:
 *         description: Unauthorized, missing or invalid token
 *       500:
 *         description: Internal Server Error
 */

app.use(express.json());
app.post("/recipes", verifyToken, async (req, res) => {
  try {
    const recipe = new Recipes(
      {
        category: req.body.category,
        name: req.body.name,
        description: req.body.description,
        ingredients: req.body.ingredients,
        instructions: req.body.instructions,
      }
    );
    const findRecipe = await Recipes.findOne({ name: recipe.name });
    if (findRecipe) {
      res.status(400).send('Recipe already exists');
      return;
    }
    const savedRecipe = await recipe.save();
    console.log(savedRecipe);
    res.status(201).send("Recipe Created");
  } catch (err) {
    console.log(err);
  }
});

/**
 * @swagger
 * /recipes/{name}:
 *   delete:
 *     summary: Delete a recipe by name
 *     description: Delete a recipe by providing its name.
 *     tags:
 *       - Recipes
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         description: The name of the recipe to be deleted.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Recipe successfully deleted
 *       404:
 *         description: Recipe not found
 *       401:
 *         description: Unauthorized, missing or invalid token
 *       500:
 *         description: Internal Server Error
 */

app.delete("/recipes/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const findRecipe = await Recipes.findOne({ id: id });
    if (!findRecipe) {
      res.status(404).send('Recipe does not exist');
      return;
    }
    await Recipes.findOneAndDelete({ id:id });
    res.send("Recipe deleted");
  } catch (err) {
    console.log(err);
  }
});

/**
 * @swagger
 * /recipes/{name}:
 *   put:
 *     summary: Update a recipe by name
 *     description: Update a recipe by providing its name and new details.
 *     tags:
 *       - Recipes
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         description: The name of the recipe to be updated.
 *         schema:
 *           type: string
 *     requestBody:
 *       description: New details for the recipe
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               category:
 *                 type: string
 *                 description: The updated category of the recipe.
 *               name:
 *                 type: string
 *                 description: The updated name of the recipe.
 *               description:
 *                 type: string
 *                 description: The updated description of the recipe.
 *               ingredients:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: The updated array of ingredients for the recipe.
 *               instructions:
 *                 type: string
 *                 description: The updated instructions to prepare the recipe.
 *     responses:
 *       200:
 *         description: Recipe successfully updated
 *       404:
 *         description: Recipe not found
 * 
 *       401:
 *         description: Unauthorized, missing or invalid token
 *       500:
 *         description: Internal Server Error
 */

app.put("/recipes/:id", verifyTokenAndAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const findRecipe = await Recipes.findOne({ id: id });

    if (!findRecipe) {
      res.status(404).send('Recipe not found');
      return;
    }

    const updatedRecipe = await Recipes.findOneAndUpdate(
      { id: id },
      {
        category: req.body.category,
        name: req.body.name,
        description: req.body.description,
        ingredients: req.body.ingredients,
        instructions: req.body.instructions,
      },
      { new: true },
    );
    res.send(updatedRecipe);
  } catch (err) {
    console.log(err);
    res.send(err);
  }
});

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));