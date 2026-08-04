const test = require('node:test');
const assert = require('node:assert/strict');
const repository = require('./users.repository');
const service = require('./users.service');

test('user pagination normalizes filters and caps page size', async () => {
    let received;
    repository.findAllUsers = async (filters) => { received = filters; return { items: [{ id: 1 }], total: 201 }; };
    const result = await service.getUsers({ page: '2', pageSize: '1000', search: ' Ada ', is_active: 'false', order: 'desc' });
    assert.equal(received.pageSize, 100);
    assert.equal(received.search, 'Ada');
    assert.equal(received.is_active, false);
    assert.equal(result.totalPages, 3);
});

test('student creation requires a class', async () => {
    repository.findRoleNameById = async () => 'student';
    await assert.rejects(
        service.createUser({ role_id: 3, name: 'Student', email: 'student@example.com', password: '12345678' }),
        (error) => error.errorCode === 'STUDENT_CLASS_REQUIRED'
    );
});

test('new user passwords require at least eight characters', async () => {
    await assert.rejects(
        service.createUser({ role_id: 2, name: 'Teacher', email: 'teacher@example.com', password: '1234567' }),
        (error) => error.errorCode === 'PASSWORD_TOO_SHORT'
    );
});

test('user options only allow supported roles and normalize class filters', async () => {
    let received;
    repository.findUserOptions = async (filters) => { received = filters; return [{ id: 1, name: 'Ada', class_id: 4 }]; };

    const result = await service.getUserOptions({ role: ' STUDENT ', class_id: '4' });

    assert.deepEqual(received, { role: 'student', classId: 4 });
    assert.equal(result.length, 1);
    await assert.rejects(
        service.getUserOptions({ role: 'admin' }),
        (error) => error.errorCode === 'INVALID_USER_OPTION_ROLE'
    );
});
