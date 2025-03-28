import arcjet, { createMiddleware, detectBot, shield } from "@arcjet/next";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/account(.*)",
  "/transaction(.*)",
]);

// Create Arcjet middleware
const aj = arcjet({
  key: process.env.ARCJET_KEY,
  rules: [
    shield({ mode: "LIVE" }),
    detectBot({
      mode: "DRY_RUN", // Log only, does not block
      allow: [
        "CATEGORY:SEARCH_ENGINE", // Google, Bing, etc
        "GO_HTTP", // For Inngest
      ],
    }),
  ],
});

// Create base Clerk middleware
const clerk = clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();

  // Don't block public API routes
  if (req.nextUrl.pathname.startsWith("/api/public")) {
    return NextResponse.next();
  }

  if (!userId && isProtectedRoute(req)) {
    const { redirectToSignIn } = await auth();
    return redirectToSignIn();
  }

  return NextResponse.next();
});

// Chain middlewares - ArcJet runs first, then Clerk
export default createMiddleware(aj, clerk);

export const config = {
  matcher: [
    // Skip Next.js internals and static files, but run on API routes
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/api/(protected|private)(.*)", // Protect specific API routes
  ],
};
