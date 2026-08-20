package local.leitor.api;

import local.leitor.Application;

/**
 * Backwards-compatible entry point for older launch commands.
 * Use {@link local.leitor.Application} for new integrations.
 */
@Deprecated(forRemoval = false)
public final class LeitorInteligenteApplication {
  private LeitorInteligenteApplication() {}

  public static void main(String[] args) {
    Application.main(args);
  }
}