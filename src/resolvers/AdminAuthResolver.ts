import {Arg, Ctx, Mutation, Query} from "type-graphql";
import {GQLAdministrator} from "../types/GQLAdministrator";
import {Administrator} from "../models/Administrator";
import {ApolloError} from "apollo-server-errors";
import {getJWTToken} from "..";
import * as bcrypt from 'bcrypt'
import {GQLLogoutResult} from "../types/GQLLogoutResult";
import * as moment from "moment";
import {Resolver}  from "type-graphql";
@Resolver()
export class AdminAuthResolver{
    @Mutation(type=>GQLAdministrator)
    async adminLogin(@Arg('username') username:string,@Arg('password') password:string, @Ctx() ctx:any){
        const user = await Administrator.findOne({where:{ username }})
        if (user == null) {
            throw new ApolloError(
                'Wrong email or password',
                'WRONG_CREDENTIALS'
            )
        }
        if (!bcrypt.compareSync(password, user.password)) {
            throw new ApolloError(
                'Wrong email or password',
                'WRONG_CREDENTIALS'
            )
        }

        if (user.isBlocked) {
            throw new ApolloError(
                'Your account has been blocked',
                'BLOCKED_ADMIN'
            )
        }

        let secret = process.env['APP_SECRET']
        if (!secret) {
            throw new ApolloError('Please set env APP_SECRET')
        }
        let expire:number=parseInt(process.env.ADMINISTRATOR_SESSION_EXPIRE || '365')
        user.token = getJWTToken({ id: user.id ,type:'admin'},expire)
        ctx.session.res.cookie('admin_token', user.token, {
            httpOnly: true,
            expires: moment()
                .add(expire, 'day')
                .toDate(),
        })
        return user
    }
    @Query(type=>GQLAdministrator)
    async adminCheck(@Ctx() context:any){
        if (!context.administrator) throw new ApolloError('Admin not authorized')
        return Administrator.findOneOrFail({id:context.administrator.id})

    }
    @Mutation(type=>GQLLogoutResult)
    async adminLogOut(@Ctx() ctx: any) {
        ctx.session.res.clearCookie('admin_token')
        return {
            message: 'Logout success',
            code: 'SUCCESS',
        }
    }

}