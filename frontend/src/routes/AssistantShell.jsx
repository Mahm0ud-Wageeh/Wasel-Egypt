import { Outlet } from 'react-router-dom'
import { AiAssistantProvider } from '../ai/AiAssistantContext'
import { AiAssistantDrawer, AiAssistantLauncher } from '../ai/AiAssistantDrawer'

/**
 * App-wide AI assistant shell — a pathless layout route rendered inside
 * the router (assistant actions need useNavigate). Every page renders
 * through it: route content first, then the floating launcher and the
 * chat drawer, so the assistant is one product surface across the app.
 *
 * Kept in its own module to avoid a main.jsx ↔ routes/index.jsx import
 * cycle (main imports the router; the router would import main).
 */
export function AssistantShell() {
  return (
    <AiAssistantProvider>
      <Outlet />
      <AiAssistantLauncher />
      <AiAssistantDrawer />
    </AiAssistantProvider>
  )
}
