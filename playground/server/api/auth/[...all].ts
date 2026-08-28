import { defineHandler } from 'nitro';
import { auth } from '../../auth';

export default defineHandler(ev => auth.handler(ev.req));
