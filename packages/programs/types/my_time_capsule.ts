/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/my_time_capsule.json`.
 */
export type MyTimeCapsule = {
  "address": "54ZFDozFNDgK8xWMaq7jZYRyKvWQmdN64DaLWtDxw3d5",
  "metadata": {
    "name": "myTimeCapsule",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "createCapsule",
      "discriminator": [
        195,
        104,
        42,
        180,
        127,
        169,
        62,
        3
      ],
      "accounts": [
        {
          "name": "capsule",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  97,
                  112,
                  115,
                  117,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "account",
                "path": "user_state.count",
                "account": "userState"
              }
            ]
          }
        },
        {
          "name": "userState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "cid",
          "type": "string"
        },
        {
          "name": "rewardAmount",
          "type": "u64"
        },
        {
          "name": "unlockTime",
          "type": "i64"
        },
        {
          "name": "isPrivate",
          "type": "bool"
        },
        {
          "name": "title",
          "type": "string"
        },
        {
          "name": "description",
          "type": "string"
        }
      ]
    },
    {
      "name": "deleteCapsule",
      "discriminator": [
        116,
        111,
        31,
        201,
        237,
        206,
        61,
        72
      ],
      "accounts": [
        {
          "name": "capsule",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  97,
                  112,
                  115,
                  117,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "capsule.creator",
                "account": "capsuleState"
              },
              {
                "kind": "account",
                "path": "capsule.index",
                "account": "capsuleState"
              }
            ]
          }
        },
        {
          "name": "user",
          "writable": true,
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "initUser",
      "discriminator": [
        14,
        51,
        68,
        159,
        237,
        78,
        158,
        102
      ],
      "accounts": [
        {
          "name": "userState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "unlockCapsule",
      "discriminator": [
        252,
        32,
        190,
        14,
        240,
        239,
        46,
        228
      ],
      "accounts": [
        {
          "name": "capsule",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  97,
                  112,
                  115,
                  117,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "capsule.creator",
                "account": "capsuleState"
              },
              {
                "kind": "account",
                "path": "capsule.index",
                "account": "capsuleState"
              }
            ]
          }
        },
        {
          "name": "opener",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "capsuleState",
      "discriminator": [
        33,
        170,
        10,
        215,
        8,
        91,
        48,
        209
      ]
    },
    {
      "name": "userState",
      "discriminator": [
        72,
        177,
        85,
        249,
        76,
        167,
        186,
        126
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidAmount",
      "msg": "Reward amount must be greater than 0"
    },
    {
      "code": 6001,
      "name": "invalidTime",
      "msg": "Invalid time"
    },
    {
      "code": 6002,
      "name": "invalidOpener",
      "msg": "Invalid opener"
    },
    {
      "code": 6003,
      "name": "alreadyUnlocked",
      "msg": "Capsule already unlocked"
    },
    {
      "code": 6004,
      "name": "unauthorized",
      "msg": "unauthorized"
    },
    {
      "code": 6005,
      "name": "notUnlocked",
      "msg": "Capsule not unlocked yet"
    }
  ],
  "types": [
    {
      "name": "capsuleState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "unlockTime",
            "type": "i64"
          },
          {
            "name": "cid",
            "type": "string"
          },
          {
            "name": "rewardAmount",
            "type": "u64"
          },
          {
            "name": "title",
            "type": "string"
          },
          {
            "name": "description",
            "type": "string"
          },
          {
            "name": "isUnlocked",
            "type": "bool"
          },
          {
            "name": "isPrivate",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "index",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "userState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "count",
            "type": "u64"
          }
        ]
      }
    }
  ]
};
