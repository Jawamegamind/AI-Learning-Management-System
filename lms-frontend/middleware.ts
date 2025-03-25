import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from 'next/server'

// Declaring the routes that need to be protected
const protectedRoutes = ['/dashboard']

/**
 * 
 * @param {import('next/server').NextRequest} request
 */
export const middleware = async (request: NextRequest) => {
    let supabaseResponse = NextResponse.next({
        request,
      })

    //   console.log(request)

      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll()
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
              supabaseResponse = NextResponse.next({
                request,
              })
              cookiesToSet.forEach(({ name, value, options }) =>
                supabaseResponse.cookies.set(name, value, options)
              )
            },
          },
        }
        )

        // Getting the pathname from the request
        const pathname = request.nextUrl.pathname 

        // Checking if the path name is in the protected routes
        const isProtectedRoute = protectedRoutes.includes(pathname)

        // Getting the session of the authenticated user
        const session = await supabase.auth.getUser()

        console.log("The session is: ", session)

        // If the route is protected and the user is not authenticated, redirect to the login page
        if (isProtectedRoute && session.error) {
            return NextResponse.redirect(new URL('/', request.url))
        }

        return supabaseResponse
}

export const config = {
    matcher: [
      /*
       * Match all request paths except for the ones starting with:
       * - _next/static (static files)
       * - _next/image (image optimization files)
       * - favicon.ico (favicon file)
       * Feel free to modify this pattern to include more paths.
       */
      '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
  }