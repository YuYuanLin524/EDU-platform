import {
  parseJsonImportUsers,
  validateResetPassword,
  validateUpdateUser,
  validateUserImports,
} from "../validation";
import { describe, expect, it } from "vitest";

describe("admin users validation", () => {
  it("validates import users basic rules", () => {
    expect(
      validateUserImports([
        { username: "", role: "student", class_name: "1班" },
      ])
    ).toBe("学号/工号不能为空");

    expect(
      validateUserImports([
        { username: "A001", role: "student", class_name: "" },
      ])
    ).toBe("学生账户必须选择班级后才能创建");

    expect(
      validateUserImports([
        { username: "A001", role: "teacher" },
      ])
    ).toBeNull();
  });

  it("parses json import users", () => {
    const invalid = parseJsonImportUsers("{bad json}");
    expect("error" in invalid && invalid.error).toBe("JSON 解析失败，请检查格式");

    const nonArray = parseJsonImportUsers('{"username":"A001"}');
    expect("error" in nonArray).toBe(true);

    const ok = parseJsonImportUsers(
      JSON.stringify([
        { username: "A001", role: "teacher" },
        { username: "S001", role: "student", class_name: "一班" },
      ])
    );
    expect("users" in ok).toBe(true);
  });

  it("validates update and reset payloads", () => {
    expect(
      validateUpdateUser({
        userId: 1,
        username: "",
        display_name: "张三",
        status: "active",
      })
    ).toBe("学号/工号不能为空");

    expect(
      validateUpdateUser({
        userId: 1,
        username: "A001",
        display_name: "张三",
        status: "active",
      })
    ).toBeNull();

    expect(validateResetPassword({ userId: 1, newPassword: "123" })).toBe("密码长度至少为6位");
    expect(validateResetPassword({ userId: 1, newPassword: "123456" })).toBeNull();
  });
});
