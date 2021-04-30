# End-to-end testing

On top of unit tests, this provides additional testing that tests the entire lifecycle of DeFi whale. All dependencies
and modules are integrated together as expected. As DeFi whale is a service, the e2e testing should be conducted against
the endpoints.

The tests are created with `@nestjs/testing` TestModule.
