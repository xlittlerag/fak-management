{
  description = "A lightweight Go full-stack app development environment";

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
            go # Go programming language
            sqlite # SQLite database command-line tool
            git # Git for version control (useful for Go modules)
            nodejs # For Svelte build process (npm, npx)
          ];

          # Environment variables for Go development
          shellHook = ''
            			zsh
                                    export GOPATH=$(pwd)/.go-packages
                                    export GOBIN=$GOPATH/bin
                                    export PATH=$PATH:$GOBIN

                                    # Create GOPATH directories if they don't exist
                                    mkdir -p $GOPATH/bin $GOPATH/pkg $GOPATH/src

                                    echo "Entering Go and Svelte development shell!"
                                    echo "GOPATH: $GOPATH"
                                    echo "To install Svelte dependencies: npm install"
                                    echo "To build Svelte frontend (watch mode): npm run dev"
                                    echo "To run the backend: go run main.go"

          '';
        };
      }
    );
}
