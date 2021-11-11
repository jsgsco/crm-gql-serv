const Usuario = require('../models/Usuario')
const Producto = require('../models/Producto')
const Cliente = require('../models/Cliente')
const Pedido = require('../models/Pedido')
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
        },
        obtenerPedidos: async () => {
            try {
                const pedidos = await Pedido.find({})
                return pedidos
            } catch (error) {
                console.log(error)
            }
        },
        obtenerPedidosVendedor: async (_, {}, ctx) => {
            try {
                const pedidos = await Pedido.find({ vendedor: ctx.usuario.id })
                return pedidos
            } catch (error) {
                console.log(error)
            }
        },
        obtenerPedido: async (_, {id}, ctx) => {
            const pedido = await Pedido.findById(id)
            if(!pedido) {
                throw new Error('Pedido no encontrado')
            }

            if(pedido.vendedor.toString() !== ctx.usuario.id) {
                throw new Error('No tienes las credenciales')
            }

            return pedido
            
        },
        obtenerPedidosEstado: async (_, { estado }, ctx) => {
            const pedidos = await Pedido.find({ vendedor: ctx.usuario.id, estado })

            return pedidos
        },
        mejoresClientes: async () => {
            const clientes = await Pedido.aggregate([
                { $match: { estado: "COMPLETADO" } },
                { $group: {
                    _id: "cliente",
                    total: { $sum: '$total' }
                }},
                {
                    $lookup: {
                        from: 'cliente',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'cliente'
                    }
                },
                {
                    $sort: { total: -1 }
                }
            ])

            return clientes
        },
        mejoresVendedor: async () => {
            const vendedores = await Pedido.aggregate([
                { $match: { estado: "COMPLETADO" } },
                { $group: {
                    _id: "$vendedor",
                    total: { $sum: '$total' }
                }},
                {
                    $lookup: {
                        from: 'usuarios',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'vendedor'
                    }
                },
                {
                    $limit: 3
                },
                {
                    $sort: { total: -1 }
                }
            ])

            return vendedores
        },
        buscarProducto: async (_, { texto }) => {
            const productos = await Producto.find({ $text: { $search: texto } }).limit(10)
            return productos
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
        },
        nuevoPedido: async (_, { input }, ctx) => {
            const { cliente } = input
            let clienteExiste = await Cliente.findById(cliente)
            if(!clienteExiste) {
                throw new Error('Cliente no encontrado')
            }

            if(clienteExiste.vendedor.toString() !== ctx.usuario.id) {
                throw new Error('No tienes las credenciales')
            }

            for await ( const articulo of input.pedido ) {
                const { id } = articulo

                const producto = await Producto.findById(id)

                if(articulo.cantidad > producto.existencia) {
                    throw new Error(`El articulo ${producto.nombre} excede la cantidad disponible`)
                } else {
                    producto.existencia = producto.existencia - articulo.cantidad
                    await producto.save()
                }
            }

            const nuevoPedido = new Pedido(input)
            nuevoPedido.vendedor = ctx.usuario.id

            const resultado = await nuevoPedido.save()
            return resultado
        },
        actualizarPedido: async (_, { id, input }, ctx) => {

            const { cliente } = input

            const existePedido = await Pedido.findById(id)
            if(!existePedido) {
                throw new Error('El pedido no existe')
            }

            const existeCliente = await Cliente.findById(cliente)
            if(!existeCliente) {
                throw new Error('No existe el cliente')
            }

            if(existeCliente.vendedor.toString() !== ctx.usuario.id) {
                throw new Error('No tienes las credenciales')
            }

            if( input.pedido ) {
                for await ( const articulo of input.pedido ) {
                    const { id } = articulo
                    const producto = await Producto.findById(id)
    
                    if(articulo.cantidad > producto.existencia) {
                        throw new Error(`El articulo ${producto.nombre} excede la cantidad disponible`)
                    } else {
                        producto.existencia = producto.existencia - articulo.cantidad
    
                        await producto.save()
                    }
                }
            }

            const resultado = await Pedido.findOneAndUpdate({ _id: id }, input,{ new: true })
            return resultado
        },
        eliminarPedido: async (_,{ id }, ctx) => {
            const pedido = await Pedido.findById(id)
            if(!pedido) {
                throw new Error('El pedido no existe')
            }

            if(pedido.vendedor.toString() !== ctx.usuario.id) {
                throw new Error('No tienes las credenciales')
            }

            await Pedido.findOneAndDelete({ _id: id })
            return 'Pedido Eliminado'
        }
    }
}

module.exports = resolvers