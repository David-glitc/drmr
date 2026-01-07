/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/drmr_staking.json`.
 */
export type DrmrStaking = {
  "address": "FfmtpodpDxLvyWvNi7B6NmpVx1m2LjLm2wK8jZRaTYvX",
  "metadata": {
    "name": "drmrStaking",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "close",
      "discriminator": [
        98,
        165,
        201,
        177,
        108,
        65,
        206,
        96
      ],
      "accounts": [
        {
          "name": "stakingPool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  107,
                  105,
                  110,
                  103,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "admin",
          "signer": true,
          "relations": [
            "stakingPool"
          ]
        }
      ],
      "args": []
    },
    {
      "name": "getReward",
      "discriminator": [
        221,
        63,
        124,
        201,
        96,
        218,
        238,
        29
      ],
      "accounts": [
        {
          "name": "stakingPool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  107,
                  105,
                  110,
                  103,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "staker",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  107,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "stakingPool"
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
          "docs": [
            "The user who is claiming rewards"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "stakeVault",
          "docs": [
            "Stake vault: PDA-owned token account holding staked tokens (source for rewards)"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  107,
                  101,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "stakingPool"
              }
            ]
          }
        },
        {
          "name": "rewardVault",
          "docs": [
            "Reward vault: PDA-owned token account holding reward tokens (destination)",
            "Rewards are transferred here and can be withdrawn later via withdraw function"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  119,
                  97,
                  114,
                  100,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "stakingPool"
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "initialize",
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      "accounts": [
        {
          "name": "stakingPool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  107,
                  105,
                  110,
                  103,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "stakeVault",
          "docs": [
            "Stake vault: PDA-owned token account to hold staked tokens"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  107,
                  101,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "stakingPool"
              }
            ]
          }
        },
        {
          "name": "rewardVault",
          "docs": [
            "Reward vault: PDA-owned token account to hold reward tokens"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  119,
                  97,
                  114,
                  100,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "stakingPool"
              }
            ]
          }
        },
        {
          "name": "creator",
          "docs": [
            "Anyone can create a pool - they pay for the account creation",
            "But they don't become the admin (trusted_admin is the admin)"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "drmrMint",
          "docs": [
            "The DRMR mint account (validated in function)"
          ]
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "apyBps",
          "type": "u16"
        },
        {
          "name": "maxStakeEpochCycles",
          "type": "u64"
        }
      ]
    },
    {
      "name": "stake",
      "discriminator": [
        206,
        176,
        202,
        18,
        200,
        209,
        179,
        108
      ],
      "accounts": [
        {
          "name": "stakingPool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  107,
                  105,
                  110,
                  103,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "staker",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  107,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "stakingPool"
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
          "docs": [
            "The user who is staking"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "drmrMint",
          "docs": [
            "DRMR mint account"
          ]
        },
        {
          "name": "userTokenAccount",
          "docs": [
            "User's DRMR token account (source) - Associated Token Account",
            "Automatically derived and created if needed",
            "init_if_needed automatically makes the account mutable"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "drmrMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "stakeVault",
          "docs": [
            "Stake vault: PDA-owned token account to hold staked tokens"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  107,
                  101,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "stakingPool"
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "stakeAmount",
          "type": "u64"
        },
        {
          "name": "stakePeriods",
          "type": "u8"
        }
      ]
    },
    {
      "name": "unstake",
      "discriminator": [
        90,
        95,
        107,
        42,
        205,
        124,
        50,
        225
      ],
      "accounts": [
        {
          "name": "stakingPool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  107,
                  105,
                  110,
                  103,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "staker",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  107,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "stakingPool"
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
          "docs": [
            "The user who is unstaking"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "drmrMint",
          "docs": [
            "DRMR mint account"
          ]
        },
        {
          "name": "userTokenAccount",
          "docs": [
            "User's DRMR token account (destination) - Associated Token Account",
            "Automatically derived and created if needed"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "drmrMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "stakeVault",
          "docs": [
            "Stake vault: PDA-owned token account holding staked tokens (source)"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  107,
                  101,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "stakingPool"
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "unstakeAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "updatePoolConfig",
      "discriminator": [
        68,
        236,
        203,
        122,
        179,
        62,
        234,
        252
      ],
      "accounts": [
        {
          "name": "stakingPool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  107,
                  105,
                  110,
                  103,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "admin",
          "docs": [
            "The admin who is updating the pool configuration",
            "Can be either:",
            "1. The trusted_admin PDA (seeds = [b\"trusted_admin\"])",
            "2. A regular account that matches pool.admin"
          ],
          "writable": true,
          "signer": true
        }
      ],
      "args": [
        {
          "name": "newAdmin",
          "type": {
            "option": "pubkey"
          }
        },
        {
          "name": "newStakeEpochCycles",
          "type": {
            "option": "u64"
          }
        },
        {
          "name": "newRewardCycleSeconds",
          "type": {
            "option": "u64"
          }
        },
        {
          "name": "newApyBps",
          "type": {
            "option": "u16"
          }
        },
        {
          "name": "newIsActive",
          "type": {
            "option": "bool"
          }
        }
      ]
    },
    {
      "name": "withdraw",
      "discriminator": [
        183,
        18,
        70,
        156,
        148,
        109,
        161,
        34
      ],
      "accounts": [
        {
          "name": "stakingPool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  107,
                  105,
                  110,
                  103,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "staker",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  107,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "stakingPool"
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
          "docs": [
            "The user who is withdrawing rewards"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "drmrMint",
          "docs": [
            "DRMR mint account"
          ]
        },
        {
          "name": "userTokenAccount",
          "docs": [
            "User's DRMR token account (destination) - Associated Token Account",
            "Automatically derived and created if needed"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "drmrMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "rewardVault",
          "docs": [
            "Reward vault: PDA-owned token account holding reward tokens (source)"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  119,
                  97,
                  114,
                  100,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "stakingPool"
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
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
      "name": "staker",
      "discriminator": [
        171,
        229,
        193,
        85,
        67,
        177,
        151,
        4
      ]
    },
    {
      "name": "stakingPool",
      "discriminator": [
        203,
        19,
        214,
        220,
        220,
        154,
        24,
        102
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "unauthorized",
      "msg": "Unauthorized User"
    },
    {
      "code": 6001,
      "name": "invalidMint",
      "msg": "Invalid MiNt account"
    },
    {
      "code": 6002,
      "name": "insufficientStake",
      "msg": "Unstake amount > Staked balance"
    },
    {
      "code": 6003,
      "name": "invalidRewardCycle",
      "msg": "Invalid reward cycle"
    },
    {
      "code": 6004,
      "name": "invalidApy",
      "msg": "Invalid APY"
    },
    {
      "code": 6005,
      "name": "invalidStakePeriod",
      "msg": "Invalid stake period"
    },
    {
      "code": 6006,
      "name": "invalidAmount",
      "msg": "Invalid amount"
    },
    {
      "code": 6007,
      "name": "poolInactive",
      "msg": "Pool is inactive"
    },
    {
      "code": 6008,
      "name": "noStake",
      "msg": "No stake found"
    },
    {
      "code": 6009,
      "name": "stakePeriodNotEnded",
      "msg": "Stake period has not ended"
    },
    {
      "code": 6010,
      "name": "rewardCycleNotReady",
      "msg": "Reward cycle not ready"
    },
    {
      "code": 6011,
      "name": "noRewardsAvailable",
      "msg": "No rewards available"
    },
    {
      "code": 6012,
      "name": "insufficientRewards",
      "msg": "Insufficient rewards in pool"
    },
    {
      "code": 6013,
      "name": "mathOverflow",
      "msg": "Math overflow"
    }
  ],
  "types": [
    {
      "name": "staker",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pool",
            "docs": [
              "Links staker to their staking pool"
            ],
            "type": "pubkey"
          },
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "docs": [
              "Currently staked amount (active tokens in pool, decreases on unstake)"
            ],
            "type": "u64"
          },
          {
            "name": "stakePeriods",
            "docs": [
              "Number of epoch cycles staked"
            ],
            "type": "u8"
          },
          {
            "name": "stakedAt",
            "docs": [
              "Stake start timestamp"
            ],
            "type": "i64"
          },
          {
            "name": "stakeEndTime",
            "docs": [
              "Stake end timestamp"
            ],
            "type": "i64"
          },
          {
            "name": "lastClaim",
            "docs": [
              "Last reward claim timestamp"
            ],
            "type": "i64"
          },
          {
            "name": "totalRewardsClaimed",
            "docs": [
              "Total rewards claimed by this staker"
            ],
            "type": "u64"
          },
          {
            "name": "availableRewards",
            "docs": [
              "available rewards in the reward vault that the user can claim"
            ],
            "type": "u64"
          },
          {
            "name": "totalTokenStaked",
            "docs": [
              "Lifetime cumulative total of tokens ever staked (never decreases, includes unstaked tokens)"
            ],
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "stakingPool",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "type": "pubkey"
          },
          {
            "name": "drmrMint",
            "type": "pubkey"
          },
          {
            "name": "stakeEpochCycles",
            "docs": [
              "Maximum allowed epoch cycles for stake lock-up periods"
            ],
            "type": "u64"
          },
          {
            "name": "rewardCycleSeconds",
            "docs": [
              "Reward cycle in seconds"
            ],
            "type": "u64"
          },
          {
            "name": "apyBps",
            "docs": [
              "APY in basis points (10000 = 100%)"
            ],
            "type": "u16"
          },
          {
            "name": "totalStaked",
            "docs": [
              "Total amount staked"
            ],
            "type": "u64"
          },
          {
            "name": "totalStakers",
            "docs": [
              "Total number of stakers"
            ],
            "type": "u64"
          },
          {
            "name": "totalRewardsDistributed",
            "docs": [
              "Total rewards distributed"
            ],
            "type": "u64"
          },
          {
            "name": "rewardsInPool",
            "docs": [
              "rewards still available in reward pool"
            ],
            "type": "u64"
          },
          {
            "name": "isActive",
            "docs": [
              "Pool active status"
            ],
            "type": "bool"
          },
          {
            "name": "createdAt",
            "docs": [
              "Pool creation timestamp"
            ],
            "type": "i64"
          },
          {
            "name": "lastRewardDistribution",
            "docs": [
              "Last reward distribution timestamp"
            ],
            "type": "i64"
          }
        ]
      }
    }
  ]
};
