import { TaskRunner } from "./TaskRunner";

const runner = new TaskRunner()

runner.onShutdown((statusCode) => process.exit(statusCode))
