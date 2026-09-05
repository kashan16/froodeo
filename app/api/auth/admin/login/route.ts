import { signAdminToken } from '@/lib/jwt';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    const { username, password } = (await request.json()) as { username: string; password: string };

    if (!username || !password) {
        return NextResponse.json({ error: 'username and password are required' }, { status: 400 });
    }

    const { data: admin } = await supabaseAdmin
        .from('admins')
        .select('*')
        .eq('username', username)
        .eq('is_active', true)
        .single();

    // Always run bcrypt.compare, even for a nonexistent username, against a
    // dummy hash — otherwise a "no such user" response returns measurably
    // faster than a "wrong password" one, and that timing gap lets someone
    // enumerate valid usernames.
    const hashToCompare = admin?.password_hash || '$2a$10$invalidsaltinvalidsaltinvalidsal';
    const passwordMatches = await bcrypt.compare(password, hashToCompare);

    if (!admin || !passwordMatches) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    await supabaseAdmin.from('admins').update({ last_login_at: new Date().toISOString() }).eq('id', admin.id);

    const token = signAdminToken({ sub: admin.id, username: admin.username, role: 'admin' });
    const response = NextResponse.json({ admin: { id: admin.id, username: admin.username, name: admin.name } });
    response.cookies.set('admin_token', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 12 * 60 * 60,
    });
    return response;
}