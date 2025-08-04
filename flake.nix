{
  description = "A lightweight Elixir full-stack app development environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        devShells.default = pkgs.mkShell {
          # Define the packages available in the development shell
          packages = with pkgs; [
            elixir # Elixir programming language
            inotify-tools
            sqlite # SQLite database command-line tool
            git # Git for version control (useful for Go modules)
            nodejs # For Svelte build process (npm, npx)
            pnpm
          ];

          shellHook = ''
            			zsh

          '';
        };
      }
    );
}
