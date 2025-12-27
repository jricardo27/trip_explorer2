import { Box, Typography, Button } from "@mui/material"
import { Component, ErrorInfo, ReactNode } from "react"

interface Props {
  children: ReactNode
  fallback?: ReactNode
  componentName?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Uncaught error in ${this.props.componentName || "Component"}:`, error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }
      return (
        <Box sx={{ p: 2, border: "1px solid red", borderRadius: 1, backgroundColor: "#fff0f0" }}>
          <Typography variant="subtitle1" color="error">
            Something went wrong in {this.props.componentName || "this component"}.
          </Typography>
          <Typography variant="body2" sx={{ mt: 1, fontFamily: "monospace" }}>
            {this.state.error?.message}
          </Typography>
          <Button size="small" onClick={() => this.setState({ hasError: false })} sx={{ mt: 2 }}>
            Retry
          </Button>
        </Box>
      )
    }

    return this.props.children
  }
}
