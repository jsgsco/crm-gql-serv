const Usuario = require('../models/Usuario')
const Producto = require('../models/Producto')
const Cliente = require('../models/Cliente')
const bcryptjs = require('bcryptjs')
const jwt = require('jsonwebtoken')
require('dotenv').config({ path: '.env' })

const crearToken = (usuario, secreta, expiresIn) => {

    const { id, email, nombre, apellido } = usuario

    return jwt.sign({ id, email, nombre, apellido }, secreta, { expiresIn } )
}

const resolvers = {
    Query: {
        obtenerUsuario: async (_, { token }) => {
            const usuarioId = await jwt.verify(token, process.env.SECRETA)

            return usuarioId
        },
        obtenerProductos: async () => {
            try {
                const productos = await Producto.find({})
                return productos
            } catch (error) {
                console.log(error)
            }
        },
        obtenerProducto: async (_, { id }) => {
            const producto = await Producto.findById(id)
            
            if(!producto) {
                throw new Error('Producto no encontrado')
            }

            return producto
        },
        obtenerClientes: async () => {
            const clientes = await Cliente.find({})
            return clientes
        },
        obtenerClientesVendedor: async (_, {}, ctx) => {
            const clientes = await Cliente.find({ vendedor: ctx.usuario.id.toString() })
            return clientes
        },
        obtenerCliente: async (_, { id }, ctx) => {
            const cliente = await Cliente.findById(id)
            if(!cliente) {
                throw new Error('Cliente no encontrado')
            }

            if(cliente.vendedor.toString() !== ctx.usuario.id) {
                throw new Error('No tienes las credenciales')
            }

            return cliente
        }
    },
    Mutation: {
        nuevoUsuario: async (_, { input }) => {

            const { email, password } = input 
            // Revisar si el usuario ya esta registrado
            const existeUsuario = await Usuario.findOne({ email })
            if (existeUsuario) {
                throw new Error('El usuario ya esta registrado')
            }
            // Hashear password
            const salt = await bcryptjs.genSalt(10)
            input.password = await bcryptjs.hash(password, salt)

            // Guardarlo en la db
            try {
                const usuario = new Usuario(input)
                usuario.save()
                return usuario
            } catch (error) {
                console.log(error)
            }
        },
        autenticarUsuario: async (_, { input }) => {
            const { email, password } = input

            const existeUsuario = await Usuario.findOne({ email })
            if (!existeUsuario) {
                throw new Error('El usuario no existe')
            }

            const passwordCorrecto = await bcryptjs.compare(password, existeUsuario.password)
            if(!passwordCorrecto) {
                throw new Error('El password es incorrecto')
            }

            return {
                token: crearToken(existeUsuario, process.env.SECRETA, '24h' )
            }
        },
        nuevoProducto: async (_, { input }) => {
            try {
                const producto = new Producto(input)

                const resultado = await producto.save()

                return resultado
            } catch (error) {
                console.log(error)
            }
        },
        actualizarProducto: async (_, { id, input }) => {
            let producto = await Producto.findById(id)
            
            if(!producto) {
                throw new Error('Producto no encontrado')
            }

            producto = await Producto.findOneAndUpdate({ _id: id }, input, { new: true })

            return producto
        },
        eliminarProducto: async (_, { id }) => {
            let producto = await Producto.findById(id)
            
            if(!producto) {
                throw new Error('Producto no encontrado')
            }

            await Producto.findOneAndDelete({ _id: id })

            return 'Producto Eliminado'
        },
        nuevoCliente: async (_, { input }, ctx) => {

            const { email } = input
            const cliente = await Cliente.findOne({ email })
            if(cliente) {
                throw new Error('Ese cliente ya esta registrado')
            }

            nuevoCliente.vendedor = ctx.usuario.id

            const nuevoCliente = new Cliente(input)
            const resultado = await nuevoCliente.save()
            return resultado
        },
        actualizarCliente: async (_, { id, input }, ctx) => {
            let cliente = await Cliente.findById(id)
            if(!cliente) {
                throw new Error('Cliente no encontrado')
            }

            if(cliente.vendedor.toString() !== ctx.usuario.id) {
                throw new Error('No tienes las credenciales')
            }

            cliente = await Cliente.findOneAndUpdate({_id: id}, input, {new: true})
            return cliente
        }, 
        eliminarCliente: async (_, { id }, ctx) => {
            let cliente = await Cliente.findById(id)
            if(!cliente) {
                throw new Error('Cliente no encontrado')
            }

            if(cliente.vendedor.toString() !== ctx.usuario.id) {
                throw new Error('No tienes las credenciales')
            }

            await Cliente.findOneAndDelete({ _id: id })
            return 'Cliente Eliminado'
        }
    }
}

module.exports = resolvers