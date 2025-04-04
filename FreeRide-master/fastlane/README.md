fastlane documentation
----

# Installation

Make sure you have the latest version of the Xcode command line tools installed:

```sh
xcode-select --install
```

For _fastlane_ installation instructions, see [Installing _fastlane_](https://docs.fastlane.tools/#installing-fastlane)

# Available Actions

### bump_version_rider_beta

```sh
[bundle exec] fastlane bump_version_rider_beta
```

Bump version for Rider Beta

  Parameters:

    bump_type - major, minor or patch

### bump_version_driver_beta

```sh
[bundle exec] fastlane bump_version_driver_beta
```

Bump version for Driver Beta

  Parameters:

    bump_type - major, minor or patch

### bump_version_rider

```sh
[bundle exec] fastlane bump_version_rider
```

Bump version for Rider

  Parameters:

    bump_type - major, minor or patch

### bump_version_driver

```sh
[bundle exec] fastlane bump_version_driver
```

Bump version for Driver

  Parameters:

    bump_type - major, minor or patch

### beta_driver_dev

```sh
[bundle exec] fastlane beta_driver_dev
```

Create a TestFlight beta for Driver using the Development environment

  Parameters:

    username - Apple ID username

⚠️ Note: do your first build manually on Xcode to update your certificates

### beta_rider_dev

```sh
[bundle exec] fastlane beta_rider_dev
```

Create a TestFlight beta for Rider using the Development environment

  Parameters:

    username - Apple ID username

⚠️ Note: do your first build manually on Xcode to update your certificates

### beta_driver_staging

```sh
[bundle exec] fastlane beta_driver_staging
```

Create a TestFlight beta for Driver using the Staging environment

  Parameters:

    username - Apple ID username

⚠️ Note: do your first build manually on Xcode to update your certificates

### beta_rider_staging

```sh
[bundle exec] fastlane beta_rider_staging
```

Create a TestFlight beta for Rider using the Staging environment

  Parameters:

    username - Apple ID username

⚠️ Note: do your first build manually on Xcode to update your certificates

### release_driver

```sh
[bundle exec] fastlane release_driver
```

Release Driver app to the App Store

  Parameters:

    username - Apple ID username

⚠️ Note: do your first build manually on Xcode to update your certificates

### release_rider

```sh
[bundle exec] fastlane release_rider
```

Release Rider app to the App Store

  Parameters:

    username - Apple ID username

⚠️ Note: do your first build manually on Xcode to update your certificates

### run_integration_tests

```sh
[bundle exec] fastlane run_integration_tests
```



----

This README.md is auto-generated and will be re-generated every time [_fastlane_](https://fastlane.tools) is run.

More information about _fastlane_ can be found on [fastlane.tools](https://fastlane.tools).

The documentation of _fastlane_ can be found on [docs.fastlane.tools](https://docs.fastlane.tools).
