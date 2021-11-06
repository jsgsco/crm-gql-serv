const { ApolloServer } = require('apollo-server')
const typeDefs = require('./db/schema')
const resolvers = require('./db/resolvers')
const conectarDB = require('./config/db')
const jwt = require('jsonwebtoken')
require('dotenv').config({ path: '.env' })

conectarDB()

const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({req}) => {
        const token = req.headers['authorization'] || ''
        if(token) {
            try {
                const usuario = jwt.verify(token, process.env.SECRETA)

                return {
                    usuario
                }
            } catch (error) {
                console.log(error)
            }
        }
    }
})

server.listen().then( ({url}) => {
    console.log(url)
} )