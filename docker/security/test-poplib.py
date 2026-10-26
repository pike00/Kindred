"""Regression for CPython b234a2b67539f787e191d2ef19a7cbdce32874e7."""

import poplib
import unittest


class PoplibControlCharacters(unittest.TestCase):
    def test_rejects_every_c0_and_del_before_writing(self):
        client = poplib.POP3.__new__(poplib.POP3)
        client.encoding = "UTF-8"
        client._debugging = 0
        written = []
        client._putline = written.append
        client._getresp = lambda: b"+OK"
        for code in [*range(32), 127]:
            for command in (client.user, client.pass_):
                with (
                    self.subTest(code=code, command=command.__name__),
                    self.assertRaises(ValueError),
                ):
                    command(f"safe{chr(code)}injected")
        self.assertEqual(written, [])
        client.user("ordinary-user")
        client.pass_("ordinary password")
        self.assertEqual(written, [b"USER ordinary-user", b"PASS ordinary password"])


if __name__ == "__main__":
    unittest.main()
